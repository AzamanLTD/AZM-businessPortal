// src/pages/settings/TeamAccess.jsx
// =============================================================================
// Settings → Team Access
//
// Shows all people with access to the business portal: owners, admins,
// and employees. Owners can invite new admins, change roles, and revoke
// access. This is the governance hub for "who can touch what."
// =============================================================================

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { businessOSEmployees, businessOS } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import { Card, Button, Input, Tag, Dialog, Switch } from '@/components/instrument';
import { Users, UserPlus, Shield, Trash2, Pencil, Crown, Mail, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { toast } from '@/lib/toast';

const ROLE_INFO = {
  OWNER:          { label: 'Owner',          icon: Crown,  color: 'var(--f-tint-color)' },
  ADMIN:          { label: 'Admin',           icon: Shield, color: 'var(--f-tint-color)' },
  GENERAL_MANAGER:{ label: 'General Manager', icon: Shield, color: 'var(--f-tint-color)' },
  BRANCH_MANAGER: { label: 'Branch Manager',  icon: Users,  color: 'var(--f-text)' },
  EMPLOYEE:       { label: 'Employee',        icon: Users,  color: 'var(--f-text-3)' },
};

export default function TeamAccess() {
  const { bizProfile, user } = useAuth();
  const { hasPermission, status: permStatus } = usePermission();
  const qc = useQueryClient();
  const canView = hasPermission('employees.view');
  const canInvite = hasPermission('employees.create');
  const canUpdate = hasPermission('employees.update');
  const canTerminate = hasPermission('employees.terminate');
  const canSetPerms = hasPermission('employees.permissions');

  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'EMPLOYEE', permissions: [] });
  const [expandedPerms, setExpandedPerms] = useState({}); // per-employee

  // Fetch employees. The backend resolves the actor's business context itself
  // (ownership first, then their active employment — see requirePermission's
  // resolveBusinessContext), so an authorized employee WITHOUT a
  // BusinessProfile of their own can still load the team surface. The
  // profile-only gate below was unsupported by the contract; the server
  // still refuses the request without employees.view.
  const { data: empData, isLoading } = useQuery({
    queryKey: ['business-employees'],
    queryFn: () => businessOSEmployees.list(),
    enabled: !!user?.id,
  });
  const employees = empData?.employees || [];

  // Fetch permission templates for the role selector and the permission
  // editor (same enablement rule as the employee list).
  const { data: templateData } = useQuery({
    queryKey: ['permission-templates'],
    queryFn: businessOS.getPermissionTemplates,
    enabled: !!user?.id,
  });
  const templates = templateData?.templates || {};
  // Backend-authoritative catalog + per-role defaults for the editor.
  const permCatalog = templateData?.permissionKeys || {};
  const employeeTemplates = templateData?.employeeTemplates || {};

  // Invite mutation (creates an employee record linked to a user by email)
  const inviteMut = useMutation({
    mutationFn: (data) => businessOSEmployees.create(data),
    onSuccess: () => {
      toast.go('Team member added');
      qc.invalidateQueries(['business-employees']);
      setShowInvite(false);
      setInviteForm({ email: '', role: 'EMPLOYEE', permissions: [] });
    },
    onError: (e) => toast.stop('Failed to add: ' + e.message),
  });

  // Update role mutation
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => businessOSEmployees.update(id, data),
    onSuccess: () => {
      toast.go('Role updated');
      qc.invalidateQueries(['business-employees']);
    },
    onError: (e) => toast.stop('Failed: ' + e.message),
  });

  // Remove mutation
  const removeMut = useMutation({
    mutationFn: (id) => businessOSEmployees.remove(id),
    onSuccess: () => {
      toast.go('Access revoked');
      qc.invalidateQueries(['business-employees']);
    },
    onError: (e) => toast.stop('Failed: ' + e.message),
  });

  // Update permissions mutation. The row's editor awaits mutateAsync so no
  // optimistic success is ever claimed: the editor closes only after the
  // server confirms, and keeps its state open + honest on refusal.
  const setPermsMut = useMutation({
    mutationFn: ({ id, permissions }) => businessOSEmployees.setPermissions(id, permissions),
    onSuccess: () => {
      toast.go('Permissions updated');
      qc.invalidateQueries(['business-employees']);
    },
    onError: (e) => toast.stop('Failed: ' + e.message),
  });

  // Split employees into owners/admins vs regular employees
  const owners = employees.filter(e => e.role === 'OWNER' || e.role === 'ADMIN' || e.role === 'GENERAL_MANAGER');
  const staff = employees.filter(e => !owners.includes(e));

  // Unknown permission state (fetch failed) is not a refusal: render the
  // page and let the server refuse each mutation it must.
  if (permStatus === 'resolved' && !canView) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Lock className="w-10 h-10 text-[var(--f-text-3)] opacity-40 mb-3" />
        <h3 className="font-semibold text-[var(--f-text)]">No Access</h3>
        <p className="text-sm text-[var(--f-text-3)] mt-1">
          Your account does not have the employees.view permission the server
          requires for the team list.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Users className="w-6 h-6 text-[var(--f-tint-color)]" />
        <div className="flex-1">
          <h2 className="text-lg font-bold text-[var(--f-text)]">Team Access</h2>
          <p className="text-sm text-[var(--f-text-3)]">
            Manage who can access your business portal and what they can do.
          </p>
        </div>
        {canInvite && (
        <Button onClick={() => setShowInvite(true)}>
          <UserPlus className="w-4 h-4" /> Add Member
        </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-[var(--f-text-3)]">
          <div className="w-6 h-6 border-2 border-[var(--f-line)] border-t-[var(--f-tint-color)] rounded-full animate-spin mr-3" />
          Loading team...
        </div>
      ) : employees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="w-10 h-10 text-[var(--f-text-3)] opacity-40 mb-3" />
          <h3 className="font-semibold text-[var(--f-text)]">No Team Members Yet</h3>
          <p className="text-sm text-[var(--f-text-3)] mt-1">
            Add your first team member to grant them portal access.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Owners & Admins */}
          {owners.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-[var(--f-text-3)] uppercase tracking-wide">Owners & Admins</h3>
              {owners.map(emp => (
                <TeamMemberRow
                  key={emp.id}
                  emp={emp}
                  canUpdate={canUpdate}
                  canTerminate={canTerminate}
                  canSetPerms={canSetPerms}
                  onUpdateRole={(role) => updateMut.mutate({ id: emp.id, data: { role } })}
                  onRemove={() => { if (confirm(`Remove ${emp.fullName || emp.email}?`)) removeMut.mutate(emp.id); }}
                  expandedPerms={expandedPerms}
                  setExpandedPerms={setExpandedPerms}
                  templates={templates}
                  permCatalog={permCatalog}
                  employeeTemplates={employeeTemplates}
                  permsPendingId={setPermsMut.isPending ? setPermsMut.variables?.id : null}
                  onSetPerms={(perms) => setPermsMut.mutateAsync({ id: emp.id, permissions: perms })}
                />
              ))}
            </div>
          )}

          {/* Staff */}
          {staff.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-[var(--f-text-3)] uppercase tracking-wide">Staff</h3>
              {staff.map(emp => (
                <TeamMemberRow
                  key={emp.id}
                  emp={emp}
                  canUpdate={canUpdate}
                  canTerminate={canTerminate}
                  canSetPerms={canSetPerms}
                  onUpdateRole={(role) => updateMut.mutate({ id: emp.id, data: { role } })}
                  onRemove={() => { if (confirm(`Remove ${emp.fullName || emp.email}?`)) removeMut.mutate(emp.id); }}
                  expandedPerms={expandedPerms}
                  setExpandedPerms={setExpandedPerms}
                  templates={templates}
                  permCatalog={permCatalog}
                  employeeTemplates={employeeTemplates}
                  permsPendingId={setPermsMut.isPending ? setPermsMut.variables?.id : null}
                  onSetPerms={(perms) => setPermsMut.mutateAsync({ id: emp.id, permissions: perms })}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Invite Modal */}
      <Dialog open={showInvite} onClose={() => setShowInvite(false)} title="Add Team Member">
        <div className="space-y-4">
          <p className="text-sm text-[var(--f-text-3)]">
            Add someone to your business portal. They'll need a AZM account with the same email.
          </p>
          <Input
            label="Email Address"
            placeholder="colleague@example.com"
            value={inviteForm.email}
            onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--f-text-3)] uppercase tracking-wider">Role</label>
            <select
              className="w-full px-4 py-3 rounded-xl bg-[var(--f-ink-900)] border border-[var(--f-line)] text-[var(--f-text)] text-sm outline-none focus:border-[var(--f-tint-color)]"
              value={inviteForm.role}
              onChange={e => {
                const role = e.target.value;
                // Auto-fill permissions from template
                const tpl = templates[role];
                const perms = tpl?.permissions || [];
                setInviteForm({ ...inviteForm, role, permissions: perms });
              }}
            >
              {Object.entries(templates).map(([key, tpl]) => (
                <option key={key} value={key} style={{ background: 'var(--f-surface)' }}>
                  {tpl.label}
                </option>
              ))}
            </select>
          </div>
          {/* Selected permissions preview */}
          {inviteForm.permissions.length > 0 && (
            <div className="p-3 rounded-lg border border-[var(--f-line)] bg-[var(--f-surface)]">
              <p className="text-xs font-semibold text-[var(--f-text-3)] mb-2">
                {inviteForm.permissions.includes('*') ? 'Full access' : `${inviteForm.permissions.length} permissions`}
              </p>
              <div className="flex flex-wrap gap-1">
                {inviteForm.permissions.slice(0, 10).map(p => (
                  <Tag key={p} color="var(--f-text-3)" className="text-xs">{p}</Tag>
                ))}
                {inviteForm.permissions.length > 10 && (
                  <Tag color="var(--f-text-3)" className="text-xs">+{inviteForm.permissions.length - 10} more</Tag>
                )}
              </div>
            </div>
          )}
          <Button
            onClick={() => {
              if (!inviteForm.email.trim()) { toast.stop('Email is required'); return; }
              inviteMut.mutate({
                email: inviteForm.email.trim(),
                role: inviteForm.role,
                permissions: inviteForm.permissions,
              });
            }}
            disabled={inviteMut.isPending}
            loading={inviteMut.isPending}
            className="w-full"
          >
            <Mail className="w-4 h-4" /> Send Invite
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

// ── Team Member Row ────────────────────────────────────────────────────────
function TeamMemberRow({ emp, canUpdate, canTerminate, canSetPerms, onUpdateRole, onRemove, expandedPerms, setExpandedPerms, templates, permCatalog, employeeTemplates, permsPendingId, onSetPerms }) {
  // Permission editing state (Finding 3): a server-confirmed flow controlled
  // by employees.permissions. Nothing is claimed saved until the server says
  // so; refusals keep the editor open with the error shown.
  const [editingPerms, setEditingPerms] = useState(false);
  const [draft, setDraft] = useState([]);
  const [saveError, setSaveError] = useState(null);
  const roleInfo = ROLE_INFO[emp.role] || ROLE_INFO.EMPLOYEE;
  const RoleIcon = roleInfo.icon;
  const expanded = !!expandedPerms[emp.id];
  const perms = emp.permissions || [];

  const toggleExpanded = () => setExpandedPerms(s => ({ ...s, [emp.id]: !s[emp.id] }));

  const savingThis = permsPendingId === emp.id;
  const startEdit = () => {
    setDraft(perms.includes('*') ? ['*'] : [...perms]);
    setSaveError(null);
    setEditingPerms(true);
  };
  const cancelEdit = () => { setEditingPerms(false); setSaveError(null); };
  const toggleDraftKey = (key) => setDraft(prev =>
    prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
  );
  const applyEmployeeTemplate = (tplPerms) => { setDraft(Array.isArray(tplPerms) ? [...tplPerms] : []); setSaveError(null); };

  // Only the server's verdict closes the editor. A refusal keeps the draft
  // and shows the server's message — the row never claims success early.
  const savePerms = async () => {
    setSaveError(null);
    try {
      await onSetPerms(draft);
      setEditingPerms(false);
    } catch (e) {
      setSaveError(e?.message || 'The server refused this change.');
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${roleInfo.color}1a`, border: `1px solid ${roleInfo.color}30` }}>
          <RoleIcon className="w-5 h-5" style={{ color: roleInfo.color }} />
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-[var(--f-text)] truncate">
              {emp.fullName || emp.email}
            </p>
            <Tag color={roleInfo.color} className="text-xs">{roleInfo.label}</Tag>
          </div>
          <p className="text-xs text-[var(--f-text-3)] truncate">{emp.email}</p>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-1">
          {perms.length > 0 && (
            <button onClick={toggleExpanded} className="p-1.5 rounded-lg hover:bg-[var(--f-line)] text-[var(--f-text-3)] hover:text-[var(--f-text)] transition-colors">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
          {canSetPerms && emp.role !== 'OWNER' && !editingPerms && (
            <button
              onClick={startEdit}
              className="p-1.5 rounded-lg hover:bg-[var(--f-line)] text-[var(--f-text-3)] hover:text-[var(--f-text)] transition-colors"
              aria-label={`Edit permissions for ${emp.fullName || emp.email}`}
              title="Edit permissions (requires employees.permissions)"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
          {(canUpdate || canTerminate) && emp.role !== 'OWNER' && (
            <>
              {canUpdate && (
              <select
                className="bg-[var(--f-ink-900)] border border-[var(--f-line)] rounded-lg px-2 py-1 text-xs text-[var(--f-text)] outline-none focus:border-[var(--f-tint-color)] cursor-pointer"
                value={emp.role}
                onChange={e => onUpdateRole(e.target.value)}
              >
                {Object.entries(templates).map(([key, tpl]) => (
                  <option key={key} value={key} style={{ background: 'var(--f-surface)' }}>{tpl.label}</option>
                ))}
              </select>
              )}
              {canTerminate && (
              <button
                onClick={onRemove}
                className="p-1.5 rounded-lg hover:bg-[var(--f-bad)]/10 text-[var(--f-text-3)] hover:text-[var(--f-bad)] transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Expanded permissions */}
      {expanded && !editingPerms && (
        <div className="mt-3 pt-3 border-t border-[var(--f-line)] space-y-2">
          <p className="text-xs font-semibold text-[var(--f-text-3)] uppercase tracking-wide">
            Permissions ({perms.includes('*') ? 'Full Access' : `${perms.length} keys`})
          </p>
          {perms.includes('*') ? (
            <Tag className="text-xs">Full Access</Tag>
          ) : (
            <div className="flex flex-wrap gap-1">
              {perms.map(p => (
                <Tag key={p} color="var(--f-text-3)" className="text-xs font-mono">{p}</Tag>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Permission editor — gated by employees.permissions; the server
          enforces the delegation ceiling on every save. */}
      {editingPerms && (
        <div className="mt-3 pt-3 border-t border-[var(--f-line)] space-y-3" data-testid={`perms-editor-${emp.id}`}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[var(--f-text-3)] uppercase tracking-wide">
              Edit permissions — {emp.fullName || emp.email}
            </p>
            <span className="text-xs text-[var(--f-text-3)]">
              {draft.includes('*') ? 'Full access' : `${draft.length} keys`}
            </span>
          </div>

          {/* Quick-apply backend role templates */}
          {Object.keys(employeeTemplates).length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-xs text-[var(--f-text-3)]">Template:</span>
              {Object.entries(employeeTemplates).map(([role, tplPerms]) => (
                <button
                  key={role}
                  onClick={() => applyEmployeeTemplate(tplPerms)}
                  disabled={savingThis}
                  className="text-xs px-2 py-1 rounded-lg border border-[var(--f-line)] text-[var(--f-text)] hover:bg-[var(--f-line)] disabled:opacity-50 transition-colors"
                >
                  {role}
                </button>
              ))}
            </div>
          )}

          {/* Full-access switch + canonical key catalog */}
          <div className="flex items-center gap-2">
            <Switch checked={draft.includes('*')} onChange={v => setDraft(v ? ['*'] : [])} disabled={savingThis} />
            <span className="text-xs text-[var(--f-text-3)]">Full access (all keys)</span>
          </div>
          {!draft.includes('*') && (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {Object.entries(permCatalog).map(([group, keys]) => (
                <div key={group}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--f-text-3)] mb-1">{group}</p>
                  <div className="grid grid-cols-2 gap-1">
                    {keys.map(k => (
                      <label key={k.key} className="flex items-center gap-1.5 text-xs text-[var(--f-text)] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={draft.includes(k.key)}
                          onChange={() => toggleDraftKey(k.key)}
                          disabled={savingThis}
                          className="accent-[var(--f-tint-color)]"
                        />
                        <span className="truncate" title={k.key}>{k.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {saveError && (
            <p className="text-xs text-[var(--f-bad)]" data-testid={`perms-error-${emp.id}`}>
              {saveError}
            </p>
          )}

          <div className="flex items-center gap-2">
            <Button onClick={savePerms} disabled={savingThis}>
              {savingThis ? 'Saving…' : 'Save permissions'}
            </Button>
            <button onClick={cancelEdit} disabled={savingThis}
              className="text-xs text-[var(--f-text-3)] hover:text-[var(--f-text)] disabled:opacity-50">
              Cancel
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
