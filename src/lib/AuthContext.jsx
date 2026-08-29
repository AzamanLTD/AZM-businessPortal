import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth, business, request } from './api';
import { setAccessToken } from './apiCore';
import { connectSocket, joinUserRoom, disconnectSocket } from './socket';

function wireSocket(token, userId) {
  if (!token) return;
  const sock = connectSocket(token);
  if (userId != null) {
    if (sock.connected) joinUserRoom(userId);
    else sock.once('connect', () => joinUserRoom(userId));
  }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [bizProfile, setBizProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminBusinesses, setAdminBusinesses] = useState([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState(null);

  const selectBusiness = useCallback(async (bizId) => {
    if (!bizId) {
      setSelectedBusinessId(null);
      setBizProfile(null);
      return;
    }
    try {
      const data = await request(`/api/admin/marketplace-businesses/${bizId}`);
      setBizProfile(data.business);
      setSelectedBusinessId(bizId);
    } catch (e) {
      console.error('Failed to load business:', e);
    }
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
        localStorage.setItem('biz_user', JSON.stringify(me));
        setAuthed(true);
        wireSocket(session.accessToken, me?.id);
        if (me.role?.toUpperCase() === 'ADMIN') {
          setIsAdmin(true);
          try {
            const adminData = await request('/api/admin/marketplace-businesses');
            if (cancelled) return;
            setAdminBusinesses(adminData.businesses || []);
            const savedBizId = localStorage.getItem('admin_selected_biz');
            if (savedBizId) selectBusiness(savedBizId);
          } catch (_) {}
        } else {
          await loadProfile();
        }
      } catch (_) {
        if (!cancelled) {
          setAccessToken(null);
          setAuthed(false);
          setUser(null);
          localStorage.removeItem('biz_user');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    restore();
    return () => { cancelled = true; };
  }, [loadProfile, selectBusiness]);

  const login = useCallback(async (email, password) => {
    const data = await auth.login(email, password);
    const me = data.user || {};
    localStorage.setItem('biz_user', JSON.stringify(me));
    setUser(me);
    setAuthed(true);
    wireSocket(data.accessToken, me?.id);

    if (me.role?.toUpperCase() === 'ADMIN') {
      setIsAdmin(true);
      try {
        const adminData = await request('/api/admin/marketplace-businesses');
        setAdminBusinesses(adminData.businesses || []);
        if (adminData.businesses?.length > 0) {
          const firstBiz = adminData.businesses[0];
          localStorage.setItem('admin_selected_biz', firstBiz.id);
          selectBusiness(firstBiz.id);
        }
      } catch (e) {
        console.error('Failed to load admin businesses:', e);
      }
    } else {
      await loadProfile();
    }
    return me;
  }, [loadProfile, selectBusiness]);

  const logout = useCallback(async () => {
    disconnectSocket();
    await auth.logout();
    localStorage.removeItem('biz_user');
    localStorage.removeItem('admin_selected_biz');
    setUser(null);
    setBizProfile(null);
    setAuthed(false);
    setIsAdmin(false);
    setAdminBusinesses([]);
    setSelectedBusinessId(null);
  }, []);

  const refreshProfile = useCallback(() => loadProfile(), [loadProfile]);

  return (
    <AuthContext.Provider value={{ user, bizProfile, loading, authed, login, logout, refreshProfile, isAdmin, adminBusinesses, selectedBusinessId, selectBusiness }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
