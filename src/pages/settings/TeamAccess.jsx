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
import { Card, Button, Input, Badge, Modal, Switch } from '@/components/ui';
import { Users, UserPlus, Shield, Trash2, Pencil, Crown, Mail, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { toast } from 'sonner';

const ROLE_INFO = {
  OWNER:          { label: 'Owner',          icon: Crown,  color: 'var(--f-tint-color)' },
  ADMIN:          { label: 'Admin',           icon: Shield, color: 'var(--f-tint-color)' },
  GENERAL_MANAGER:{ label: 'General Manager', icon: Shield, color: 'var(--f-tint-color)' },
  BRANCH_MANAGER: { label: 'Branch Manager',  icon: Users,  color: 'var(--f-text)' },
  EMPLOYEE:       { label: 'Employee',        icon: Users,  color: 'var(--f-text-3)' },
};

export default function TeamAccess() {
  const { bizProfile, user } = useAuth();
  const { hasPermission } = usePermission();
  const qc = useQueryClient();
  const canManage = hasPermission('team.manage');

  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'EMPLOYEE', permissions: [] });
  const [expandedPerms, setExpandedPerms] = useState({}); // per-employee

  // Fetch employees
  const { data: empData, isLoading } = useQuery({
    queryKey: ['business-employees'],
    queryFn: () => businessOSEmployees.list(),
    enabled: !!bizProfile,
  });
  const employees = empData?.employees || [];

  // Fetch permission templates for the role selector
  const { data: templateData } = useQuery({
    queryKey: ['permission-templates'],
    queryFn: businessOS.getPermissionTemplates,
    enabled: !!bizProfile,
  });
  const templates = templateData?.templates || {};

  // Invite mutation (creates an employee record linked to a user by email)
  const inviteMut = useMutation({
    mutationFn: (data) => businessOSEmployees.create(data),
    onSuccess: () => {
      toast.success('Team member added');
      qc.invalidateQueries(['business-employees']);
      setShowInvite(false);
      setInviteForm({ email: '', role: 'EMPLOYEE', permissions: [] });
    },
    onError: (e) => toast.error('Failed to add: ' + e.message),
  });

  // Update role mutation
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => businessOSEmployees.update(id, data),
    onSuccess: () => {
      toast.success('Role updated');
      qc.invalidateQueries(['business-employees']);
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  // Remove mutation
  const removeMut = useMutation({
    mutationFn: (id) => businessOSEmployees.remove(id),
    onSuccess: () => {
      toast.success('Access revoked');
      qc.invalidateQueries(['business-employees']);
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  // Update permissions mutation
  const setPermsMut = useMutation({
    mutationFn: ({ id, permissions }) => businessOSEmployees.setPermissions(id, permissions),
    onSuccess: () => {
      toast.success('Permissions updated');
      qc.invalidateQueries(['business-employees']);
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  // Split employees into owners/admins vs regular employees
  const owners = employees.filter(e => e.role === 'OWNER' || e.role === 'ADMIN' || e.role === 'GENERAL_MANAGER');
  const staff = employees.filter(e => !owners.includes(e));

  if (!canManage) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Lock className="w-10 h-10 text-[var(--f-text-3)] opacity-40 mb-3" />
        <h3 className="font-semibold text-[var(--f-text)]">No Access</h3>
        <p className="text-sm text-[var(--f-text-3)] mt-1">
          You don't have permission to manage team access.
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
        <Button onClick={() => setShowInvite(true)}>
          <UserPlus className="w-4 h-4" /> Add Member
        </Button>
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
                  canManage={canManage}
                  onUpdateRole={(role) => updateMut.mutate({ id: emp.id, data: { role } })}
                  onRemove={() => { if (confirm(`Remove ${emp.fullName || emp.email}?`)) removeMut.mutate(emp.id); }}
                  expandedPerms={expandedPerms}
                  setExpandedPerms={setExpandedPerms}
                  templates={templates}
                  onSetPerms={(perms) => setPermsMut.mutate({ id: emp.id, permissions: perms })}
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
                  canManage={canManage}
                  onUpdateRole={(role) => updateMut.mutate({ id: emp.id, data: { role } })}
                  onRemove={() => { if (confirm(`Remove ${emp.fullName || emp.email}?`)) removeMut.mutate(emp.id); }}
                  expandedPerms={expandedPerms}
                  setExpandedPerms={setExpandedPerms}
                  templates={templates}
                  onSetPerms={(perms) => setPermsMut.mutate({ id: emp.id, permissions: perms })}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Invite Modal */}
      <Modal open={showInvite} onClose={() => setShowInvite(false)} title="Add Team Member">
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
                  <Badge key={p} color="var(--f-text-3)" className="text-xs">{p}</Badge>
                ))}
                {inviteForm.permissions.length > 10 && (
                  <Badge color="var(--f-text-3)" className="text-xs">+{inviteForm.permissions.length - 10} more</Badge>
                )}
              </div>
            </div>
          )}
          <Button
            onClick={() => {
              if (!inviteForm.email.trim()) { toast.error('Email is required'); return; }
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
      </Modal>
    </div>
  );
}

// ── Team Member Row ────────────────────────────────────────────────────────
function TeamMemberRow({ emp, canManage, onUpdateRole, onRemove, expandedPerms, setExpandedPerms, templates, onSetPerms }) {
  const roleInfo = ROLE_INFO[emp.role] || ROLE_INFO.EMPLOYEE;
  const RoleIcon = roleInfo.icon;
  const expanded = !!expandedPerms[emp.id];
  const perms = emp.permissions || [];

  const toggleExpanded = () => setExpandedPerms(s => ({ ...s, [emp.id]: !s[emp.id] }));

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
            <Badge color={roleInfo.color} className="text-xs">{roleInfo.label}</Badge>
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
          {canManage && emp.role !== 'OWNER' && (
            <>
              <select
                className="bg-[var(--f-ink-900)] border border-[var(--f-line)] rounded-lg px-2 py-1 text-xs text-[var(--f-text)] outline-none focus:border-[var(--f-tint-color)] cursor-pointer"
                value={emp.role}
                onChange={e => onUpdateRole(e.target.value)}
              >
                {Object.entries(templates).map(([key, tpl]) => (
                  <option key={key} value={key} style={{ background: 'var(--f-surface)' }}>{tpl.label}</option>
                ))}
              </select>
              <button
                onClick={onRemove}
                className="p-1.5 rounded-lg hover:bg-[var(--f-bad)]/10 text-[var(--f-text-3)] hover:text-[var(--f-bad)] transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Expanded permissions */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-[var(--f-line)] space-y-2">
          <p className="text-xs font-semibold text-[var(--f-text-3)] uppercase tracking-wide">
            Permissions ({perms.includes('*') ? 'Full Access' : `${perms.length} keys`})
          </p>
          {perms.includes('*') ? (
            <Badge className="text-xs">Full Access</Badge>
          ) : (
            <div className="flex flex-wrap gap-1">
              {perms.map(p => (
                <Badge key={p} color="var(--f-text-3)" className="text-xs font-mono">{p}</Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
