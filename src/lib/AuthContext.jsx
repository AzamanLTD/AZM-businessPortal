import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { auth, business, request } from './api';
import { setAccessToken } from './apiCore';
import { connectSocket, joinUserRoom, disconnectSocket } from './socket';
import { ensureRealtimeQueryBridge } from './query-client';
import { queryClient } from './query-client';

function wireSocket(token, userId) {
  if (!token) return;
  const sock = connectSocket(token);
  // The realtime bridge is keyed by socket identity. Calling this after every
  // login/session restore makes logout -> login cycles safe when the singleton
  // socket instance has been replaced.
  ensureRealtimeQueryBridge();
  if (userId != null) {
    if (sock.connected) joinUserRoom(userId);
    else sock.once('connect', () => joinUserRoom(userId));
  }
}

const SELECTED_BIZ_KEY = 'admin_selected_biz';

/**
 * Controlled admin business-context transition.
 *
 * The invariant this function protects: the selected id, the persisted
 * `admin_selected_biz` (read by apiCore on EVERY request as
 * x-admin-business-id), the loaded profile, the visible context indicator and
 * the TanStack Query cache move TOGETHER, only after the target business is
 * confirmed loadable. The previous context stays fully consistent until then.
 *
 * Sequence:
 *   1. Refuse to run for a non-admin (client-side; the server re-validates
 *      the ADMIN role independently in middleware/adminBusinessScope.js).
 *   2. If business mutations are in flight, DEFER the switch: keep the old
 *      context active (consistent) and replay the switch once the last
 *      mutation settles — a switch never races an in-flight mutation.
 *   3. Raise the switching gate (full-page transition state — business pages
 *      unmount, so no business queries are mounted while the context moves).
 *   4. Cancel in-flight queries, then REMOVE all cached query data so no
 *      business A result can ever be presented under business B (late
 *      responses resolve against removed query objects, not new ones).
 *   5. Load the target profile through the ADMIN endpoint (no business scope
 *      needed — the header still targets the old business at this point).
 *   6. Commit atomically on success: persistence + selectedBusinessId +
 *      bizProfile together. On failure nothing is committed — the UI keeps
 *      displaying the (still true) old context and surfaces the error.
 *
 * Rapid successive switches are serialized by a sequence token: only the
 * latest transition may commit.
 */
export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [bizProfile, setBizProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminBusinesses, setAdminBusinesses] = useState([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState(null);
  // { targetId, targetName, waitingForMutations } while a transition is running.
  const [switching, setSwitching] = useState(null);
  // { message, targetName, fromName, kind: 'switch' | 'restore' } on failure.
  const [switchError, setSwitchError] = useState(null);

  const switchSeq = useRef(0);
  const isAdminRef = useRef(false);
  const mutationWatcher = useRef(null);
  const pendingSwitch = useRef(null);

  const nameOf = (list, id) => (list || []).find(b => b.id === id)?.businessName || 'the selected business';

  const clearBusinessCache = useCallback(async () => {
    // Cancel first: in-flight queries are marked cancelled so their results
    // are discarded. Then remove all cached data so no stale business-scoped
    // entry can repopulate a page under the next context. This runs while
    // the switching gate has business pages unmounted, so nothing refetches
    // against the old context after the clear.
    await queryClient.cancelQueries();
    queryClient.removeQueries();
  }, []);

  const runBusinessSwitch = useCallback(async (bizId, opts = {}) => {
    const targetName = opts.targetName || nameOf(adminBusinesses, bizId) || 'the selected business';
    const fromId = selectedBusinessId;
    const fromName = fromId ? nameOf(adminBusinesses, fromId) : null;
    const seq = ++switchSeq.current;

    // 1. Only a genuine server-confirmed ADMIN can move the admin context.
    //    A non-admin can never activate switching through storage or UI.
    if (!isAdminRef.current) {
      setSwitching(null);
      return { ok: false, refused: true };
    }

    // 2. Never race an in-flight business mutation: defer the switch until
    //    the last mutation settles, keeping the old context fully consistent.
    if (queryClient.isMutating() > 0) {
      pendingSwitch.current = { bizId, targetName };
      setSwitching({ targetId: bizId, targetName, waitingForMutations: true });
      if (!mutationWatcher.current) {
        mutationWatcher.current = queryClient.getMutationCache().subscribe(() => {
          if (pendingSwitch.current && queryClient.isMutating() === 0) {
            const { bizId: nextId, targetName: nextName } = pendingSwitch.current;
            pendingSwitch.current = null;
            if (mutationWatcher.current) { mutationWatcher.current(); mutationWatcher.current = null; }
            runBusinessSwitch(nextId, { targetName: nextName });
          }
        });
      }
      return { ok: false, deferred: true };
    }

    setSwitchError(null);
    setSwitching({ targetId: bizId, targetName, waitingForMutations: false });

    try {
      // 3+4. Gate pages off (React flush), then isolate the query cache.
      await new Promise(r => setTimeout(r, 0));
      if (switchSeq.current !== seq) return { ok: false, superseded: true };
      await clearBusinessCache();
      if (switchSeq.current !== seq) return { ok: false, superseded: true };

      // 5. Load the target profile through the admin listing endpoint — no
      //    business-scoped request is issued before the context commits.
      const data = await request(`/api/admin/marketplace-businesses/${bizId}`);
      if (switchSeq.current !== seq) return { ok: false, superseded: true };
      if (!data?.business) throw new Error('Business not found.');

      // 6. Atomic commit: persistence, selected id and profile move together.
      localStorage.setItem(SELECTED_BIZ_KEY, bizId);
      setSelectedBusinessId(bizId);
      setBizProfile(data.business);
      setSwitching(null);
      return { ok: true };
    } catch (e) {
      if (switchSeq.current !== seq) return { ok: false, superseded: true };
      setSwitching(null);
      // Nothing was committed: the header, persisted id, selected id and
      // displayed profile all still describe the OLD context consistently.
      // Only when there was no prior context (fresh restore) do we drop the
      // persisted id so a dead selection can never linger in storage.
      if (!fromId) localStorage.removeItem(SELECTED_BIZ_KEY);
      setSwitchError({
        kind: opts.onRestore ? 'restore' : 'switch',
        targetName,
        fromName,
        message: e?.message || 'Failed to load business.',
      });
      return { ok: false, error: e };
    }
  }, [adminBusinesses, selectedBusinessId, clearBusinessCache, nameOf]);

  const selectBusiness = useCallback((bizId, opts = {}) => {
    if (bizId == null) {
      // Return to the marketplace overview: clear the context atomically.
      switchSeq.current++;
      pendingSwitch.current = null;
      if (mutationWatcher.current) { mutationWatcher.current(); mutationWatcher.current = null; }
      localStorage.removeItem(SELECTED_BIZ_KEY);
      setSelectedBusinessId(null);
      setBizProfile(null);
      setSwitching(null);
      setSwitchError(null);
      // Business pages unmount (App redirects to the marketplace overview),
      // but clear the cache too so no stale business data survives logout-like
      // transitions or a later re-select of a different business.
      queryClient.cancelQueries().then(() => queryClient.removeQueries());
      return Promise.resolve({ ok: true, cleared: true });
    }
    return runBusinessSwitch(bizId, opts);
  }, [runBusinessSwitch]);

  const loadAdminBusinesses = useCallback(async () => {
    const adminData = await request('/api/admin/marketplace-businesses');
    setAdminBusinesses(adminData.businesses || []);
    return adminData.businesses || [];
  }, []);

  const loadProfile = useCallback(async () => {
    const data = await business.me();
    setBizProfile(data.business || null);
    return data;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      try {
        const session = await auth.restore();
        if (cancelled) return;
        setAccessToken(session.accessToken);
        const me = session.user || {};
        setUser(me);
        isAdminRef.current = me.role?.toUpperCase() === 'ADMIN';
        localStorage.setItem('biz_user', JSON.stringify(me));
        setAuthed(true);
        wireSocket(session.accessToken, me?.id);
        if (me.role?.toUpperCase() === 'ADMIN') {
          setIsAdmin(true);
          try {
            const businesses = await loadAdminBusinesses();
            if (cancelled) return;
            // Session restoration preserves an intentional selection — but
            // only if the saved business still exists and can be loaded.
            const savedBizId = localStorage.getItem(SELECTED_BIZ_KEY);
            if (savedBizId) {
              const exists = businesses.some(b => b.id === savedBizId);
              if (exists) {
                selectBusiness(savedBizId, { onRestore: true, targetName: nameOf(businesses, savedBizId) });
              } else {
                // Honest failure: the saved business is gone. Clear the dead
                // selection and land on the marketplace overview.
                localStorage.removeItem(SELECTED_BIZ_KEY);
                setSwitchError({
                  kind: 'restore',
                  targetName: null,
                  fromName: null,
                  message: 'Your previously selected business is no longer available.',
                });
              }
            }
          } catch (_) { /* admin listing failure is surfaced by the overview */ }
        } else {
          await loadProfile();
        }
      } catch (_) {
        if (!cancelled) {
          setAccessToken(null);
          setAuthed(false);
          setUser(null);
          isAdminRef.current = false;
          localStorage.removeItem('biz_user');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    restore();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadProfile, loadAdminBusinesses]);

  const login = useCallback(async (email, password) => {
    const data = await auth.login(email, password);
    const me = data.user || {};
    localStorage.setItem('biz_user', JSON.stringify(me));
    setUser(me);
    setAuthed(true);
    isAdminRef.current = me.role?.toUpperCase() === 'ADMIN';
    wireSocket(data.accessToken, me?.id);

    if (me.role?.toUpperCase() === 'ADMIN') {
      setIsAdmin(true);
      // A fresh admin login ALWAYS starts from the marketplace overview —
      // no implicit first-business selection. Any prior selection is cleared
      // so the header, storage and UI agree that no business is in context.
      localStorage.removeItem(SELECTED_BIZ_KEY);
      setSelectedBusinessId(null);
      setBizProfile(null);
      setSwitchError(null);
      try {
        await loadAdminBusinesses();
      } catch (e) {
        console.error('Failed to load admin businesses:', e);
      }
    } else {
      await loadProfile();
    }
    return me;
  }, [loadProfile, loadAdminBusinesses]);

  const logout = useCallback(async () => {
    disconnectSocket();
    await auth.logout();
    // Logout clears the selected admin-business context completely: a
    // subsequent fresh login starts from the marketplace overview.
    switchSeq.current++;
    pendingSwitch.current = null;
    if (mutationWatcher.current) { mutationWatcher.current(); mutationWatcher.current = null; }
    localStorage.removeItem('biz_user');
    localStorage.removeItem(SELECTED_BIZ_KEY);
    setUser(null);
    setBizProfile(null);
    setAuthed(false);
    setIsAdmin(false);
    isAdminRef.current = false;
    setAdminBusinesses([]);
    setSelectedBusinessId(null);
    setSwitching(null);
    setSwitchError(null);
    queryClient.cancelQueries().then(() => queryClient.removeQueries());
  }, []);

  const refreshProfile = useCallback(() => loadProfile(), [loadProfile]);

  // True while an admin is actually scoped to a business (impersonation
  // active). Consumers use this for context indicators and contract gates.
  const isAdminView = isAdmin && !!selectedBusinessId;
  // Owner status of the CURRENT context profile (false in admin view: the
  // scoped business belongs to someone else; authority comes from the server
  // granting admins ['*'] on Business OS routes, not from ownership).
  const isOwner = !!user && bizProfile != null && bizProfile.userId === user.id;

  return (
    <AuthContext.Provider value={{
      user, bizProfile, loading, authed, login, logout, refreshProfile,
      isAdmin, isAdminView, isOwner,
      adminBusinesses, selectedBusinessId, selectBusiness,
      switching, switchError,
      clearSwitchError: () => setSwitchError(null),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
