// src/pages/settings/RolesPermissions.jsx
// =============================================================================
// Settings → Roles & Permissions
//
// Shows a grid of permission keys (grouped by module) × role templates,
// with checkboxes. Owners can view system templates, create custom templates.
// =============================================================================

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { businessOS } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import { Card, Button, Input, Tag, Switch, Tabs } from '@/components/instrument';
import { Shield, Save, Lock, Check } from 'lucide-react';
import { toast } from 'sonner';

function groupByModule(permissionKeys) {
  const groups = {};
  for (const [, keys] of Object.entries(permissionKeys)) {
    for (const k of keys) {
      if (!groups[k.module]) groups[k.module] = [];
      groups[k.module].push(k);
    }
  }
  return groups;
}

export default function RolesPermissions() {
  const { bizProfile } = useAuth();
  const { hasPermission } = usePermission();
  const qc = useQueryClient();
  const canManage = hasPermission('settings.manage');

  const [customTemplateName, setCustomTemplateName] = useState('');
  const [customTemplateDesc, setCustomTemplateDesc] = useState('');
  const [selectedPerms, setSelectedPerms] = useState(new Set());

  const { data: templateData, isLoading } = useQuery({
    queryKey: ['permission-templates'],
    queryFn: businessOS.getPermissionTemplates,
    enabled: !!bizProfile,
  });

  const templates = templateData?.templates || {};
  const permissionKeys = templateData?.permissionKeys || {};
  const grouped = useMemo(() => groupByModule(permissionKeys), [permissionKeys]);
  const moduleNames = Object.keys(grouped);

  const saveTemplateMutation = useMutation({
    mutationFn: (data) => businessOS.savePermissionTemplate(data),
    onSuccess: () => {
      toast.success('Custom template saved');
      qc.invalidateQueries(['permission-templates']);
      setCustomTemplateName('');
      setCustomTemplateDesc('');
      setSelectedPerms(new Set());
    },
    onError: (e) => toast.error('Failed to save: ' + e.message),
  });

  const togglePerm = (key) => {
    const next = new Set(selectedPerms);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedPerms(next);
  };

  // ── Templates view ────────────────────────────────────────────────────────
  const templatesContent = isLoading ? (
    <div className="flex items-center justify-center py-12 text-[var(--f-text-3)]">
      <div className="w-6 h-6 border-2 border-[var(--f-line)] border-t-[var(--f-tint-color)] rounded-full animate-spin mr-3" />
      Loading templates...
    </div>
  ) : (
    <div className="space-y-4">
      {/* Template cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(templates).map(([key, tpl]) => (
          <Card key={key} className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-[var(--f-text)]">{tpl.label}</h3>
                <p className="text-xs text-[var(--f-text-3)] mt-0.5">{tpl.description}</p>
              </div>
              {tpl.system ? (
                <Tag className="text-xs"><Lock className="w-3 h-3 mr-1 inline" /> System</Tag>
              ) : (
                <Tag color="var(--f-text-3)" className="text-xs">Custom</Tag>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--f-text-3)]">
              <Check className="w-3.5 h-3.5 text-[var(--f-tint-color)]" />
              {tpl.permissions.includes('*')
                ? 'All permissions'
                : `${tpl.permissions.length} permissions`}
            </div>
            <div className="flex flex-wrap gap-1">
              {tpl.permissions.includes('*') ? (
                <Tag className="text-xs">Full Access</Tag>
              ) : (
                moduleNames.map(mod => {
                  const hasModulePerms = tpl.permissions.some(p =>
                    grouped[mod].some(k => k.key === p)
                  );
                  if (!hasModulePerms) return null;
                  return <Tag key={mod} color="var(--f-text-3)" className="text-xs">{mod}</Tag>;
                })
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Permission matrix table */}
      <Card className="overflow-hidden p-0">
        <div className="px-4 py-3 border-b border-[var(--f-line)]">
          <h3 className="text-sm font-semibold text-[var(--f-text)]">Permission Matrix</h3>
          <p className="text-xs text-[var(--f-text-3)] mt-0.5">
            Every permission key available in the system, grouped by module.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--f-line)] bg-[var(--f-surface)]">
                <th className="text-left px-4 py-2 font-semibold text-[var(--f-text)] sticky left-0 bg-[var(--f-surface)] z-10">
                  Permission
                </th>
                {Object.entries(templates).map(([key, tpl]) => (
                  <th key={key} className="px-3 py-2 text-center font-semibold text-xs text-[var(--f-text-3)] min-w-[100px]">
                    {tpl.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {moduleNames.map(mod => (
                <tbodyFragment key={mod} mod={mod} grouped={grouped} templates={templates} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  // Inline fragment for module group header + permission rows
  // (React doesn't like <> in <tbody> with map, so we flatten)
  const tableRows = [];
  moduleNames.forEach(mod => {
    tableRows.push(
      <tr key={`mod-${mod}`} className="border-b border-[var(--f-line)] bg-[var(--f-surface-sunken)]">
        <td colSpan={Object.keys(templates).length + 1} className="px-4 py-1.5 font-semibold text-xs text-[var(--f-tint-color)] uppercase tracking-wide">
          {mod}
        </td>
      </tr>
    );
    grouped[mod].forEach(perm => {
      tableRows.push(
        <tr key={perm.key} className="border-b border-[var(--f-line)] hover:bg-[var(--f-surface)]">
          <td className="px-4 py-2 text-[var(--f-text)]">
            <div className="font-medium">{perm.label}</div>
            <div className="text-xs text-[var(--f-text-3)] font-mono">{perm.key}</div>
          </td>
          {Object.entries(templates).map(([tKey, tpl]) => {
            const has = tpl.permissions.includes('*') || tpl.permissions.includes(perm.key);
            return (
              <td key={tKey} className="px-3 py-2 text-center">
                {has ? (
                  <Check className="w-4 h-4 text-[var(--f-tint-color)] mx-auto" />
                ) : (
                  <span className="text-[var(--f-text-3)] opacity-30">—</span>
                )}
              </td>
            );
          })}
        </tr>
      );
    });
  });

  // Replace the templates content table body with the flattened rows
  const templatesContentFixed = isLoading ? (
    <div className="flex items-center justify-center py-12 text-[var(--f-text-3)]">
      <div className="w-6 h-6 border-2 border-[var(--f-line)] border-t-[var(--f-tint-color)] rounded-full animate-spin mr-3" />
      Loading templates...
    </div>
  ) : (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(templates).map(([key, tpl]) => (
          <Card key={key} className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-[var(--f-text)]">{tpl.label}</h3>
                <p className="text-xs text-[var(--f-text-3)] mt-0.5">{tpl.description}</p>
              </div>
              {tpl.system ? (
                <Tag className="text-xs"><Lock className="w-3 h-3 mr-1 inline" /> System</Tag>
              ) : (
                <Tag color="var(--f-text-3)" className="text-xs">Custom</Tag>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--f-text-3)]">
              <Check className="w-3.5 h-3.5 text-[var(--f-tint-color)]" />
              {tpl.permissions.includes('*') ? 'All permissions' : `${tpl.permissions.length} permissions`}
            </div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="px-4 py-3 border-b border-[var(--f-line)]">
          <h3 className="text-sm font-semibold text-[var(--f-text)]">Permission Matrix</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--f-line)] bg-[var(--f-surface)]">
                <th className="text-left px-4 py-2 font-semibold text-[var(--f-text)] sticky left-0 bg-[var(--f-surface)] z-10">Permission</th>
                {Object.entries(templates).map(([key, tpl]) => (
                  <th key={key} className="px-3 py-2 text-center font-semibold text-xs text-[var(--f-text-3)] min-w-[100px]">{tpl.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>{tableRows}</tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  // ── Custom template view ─────────────────────────────────────────────────
  const customContent = canManage ? (
    <Card className="p-5 space-y-4">
      <div>
        <h3 className="font-semibold text-[var(--f-text)] mb-1">Create Custom Template</h3>
        <p className="text-sm text-[var(--f-text-3)]">
          Build a custom role template for positions like "Night Shift Supervisor".
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Template Name" placeholder="e.g. Night Shift Supervisor" value={customTemplateName} onChange={(e) => setCustomTemplateName(e.target.value)} />
        <Input label="Description (optional)" placeholder="What this role can do..." value={customTemplateDesc} onChange={(e) => setCustomTemplateDesc(e.target.value)} />
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-[var(--f-text)]">Select Permissions</label>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => {
              const allKeys = Object.values(grouped).flat().map(k => k.key);
              setSelectedPerms(new Set(allKeys));
            }}>Select All</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedPerms(new Set())}>Clear</Button>
          </div>
        </div>
        {moduleNames.map(mod => (
          <div key={mod} className="border border-[var(--f-line)] rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[var(--f-tint-color)] uppercase tracking-wide">{mod}</span>
              <Switch
                checked={grouped[mod].every(k => selectedPerms.has(k.key))}
                onChange={() => {
                  const allChecked = grouped[mod].every(k => selectedPerms.has(k.key));
                  const next = new Set(selectedPerms);
                  grouped[mod].forEach(k => {
                    if (allChecked) next.delete(k.key);
                    else next.add(k.key);
                  });
                  setSelectedPerms(next);
                }}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {grouped[mod].map(perm => (
                <label key={perm.key} className="flex items-center gap-2 cursor-pointer text-sm text-[var(--f-text)] hover:bg-[var(--f-surface)] rounded px-2 py-1">
                  <Switch checked={selectedPerms.has(perm.key)} onChange={() => togglePerm(perm.key)} />
                  <span className="truncate">{perm.label}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-2">
        <span className="text-sm text-[var(--f-text-3)]">
          {selectedPerms.size} permission{selectedPerms.size !== 1 ? 's' : ''} selected
        </span>
        <Button
          onClick={() => {
            if (!customTemplateName.trim()) { toast.error('Template name is required'); return; }
            saveTemplateMutation.mutate({
              name: customTemplateName.trim(),
              description: customTemplateDesc.trim(),
              permissions: Array.from(selectedPerms),
            });
          }}
          disabled={saveTemplateMutation.isPending || !customTemplateName.trim()}
          loading={saveTemplateMutation.isPending}
        >
          <Save className="w-4 h-4 mr-1.5" /> Save Template
        </Button>
      </div>
    </Card>
  ) : (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Lock className="w-10 h-10 text-[var(--f-text-3)] opacity-40 mb-3" />
      <h3 className="font-semibold text-[var(--f-text)]">Owner Only</h3>
      <p className="text-sm text-[var(--f-text-3)] mt-1">Only the owner can create custom templates.</p>
    </div>
  );

  const tabs = [
    { label: 'Role Templates', content: templatesContentFixed },
    ...(canManage ? [{ label: 'Create Custom', content: customContent }] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-[var(--f-tint-color)]" />
        <div>
          <h2 className="text-lg font-bold text-[var(--f-text)]">Roles & Permissions</h2>
          <p className="text-sm text-[var(--f-text-3)]">
            Define what each role can do. System templates are locked; create custom templates for unique positions.
          </p>
        </div>
      </div>
      <Tabs tabs={tabs} />
    </div>
  );
}
