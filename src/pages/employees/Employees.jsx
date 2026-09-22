import { useState, useEffect } from 'react';
import { employeeApi } from '@/lib/marketplaceApi';
import { Card, Button, Badge, Input, Select, Modal, Empty, Skeleton, Avatar, DropdownMenu, Tooltip, Switch } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { Users, UserPlus, MoreVertical, Mail, Phone, DollarSign, Clock, Star, Calendar, Edit2, Trash2, Ban, CheckCircle2 } from 'lucide-react';

// Roles mirror the backend EmployeeRole enum (Prisma). TRAINEE does not
// exist in the enum and was removed — it produced a 500 on create.
const ROLES = [
  { value: 'MANAGER', label: 'Manager' },
  { value: 'SUPERVISOR', label: 'Supervisor' },
  { value: 'STAFF', label: 'Staff' },
  { value: 'DRIVER', label: 'Driver' },
  { value: 'HOUSEKEEPER', label: 'Housekeeper' },
  { value: 'WAITER', label: 'Waiter' },
  { value: 'CHEF', label: 'Chef' },
  { value: 'RECEPTIONIST', label: 'Receptionist' },
  { value: 'CONCIERGE', label: 'Concierge' },
  { value: 'SECURITY', label: 'Security' },
];

// PayrollType enum values (Prisma): SALARY | HOURLY | PIECE_RATE.
// The old WEEKLY/BIWEEKLY/MONTHLY frequency values were never valid.
const PAYROLL_TYPES = [
  { value: 'SALARY', label: 'Monthly Salary' },
  { value: 'HOURLY', label: 'Hourly Rate' },
];

// Build the current ISO week (Mon-Sun) for the schedule tab.
function currentWeekRange() {
  const now = new Date();
  const day = (now.getDay() + 6) % 7; // Monday = 0
  const monday = new Date(now); monday.setDate(now.getDate() - day); monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23, 59, 59, 999);
  const iso = (d) => d.toISOString().slice(0, 10);
  return { startDate: iso(monday), endDate: iso(sunday) };
}

const STATUS_COLORS = { ACTIVE: 'var(--sn-purple)', SUSPENDED: 'var(--sn-red)', TERMINATED: 'var(--sn-text-muted)', ON_LEAVE: 'var(--sn-amber)' };

export default function Employees() {
  const { toast } = useToast();
  const [employees, setEmployees] = useState(null);
  const [shifts, setShifts] = useState(null);
  const [swapRequests, setSwapRequests] = useState(null);
  const [timeOffRequests, setTimeOffRequests] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editEmp, setEditEmp] = useState(null);
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState({ azmId: '', role: 'STAFF', jobTitle: '', monthlySalaryUsdc: '', hourlyRateUsdc: '', payrollType: 'SALARY' });
  // permDraft is the SET of enabled dotted permission keys, e.g.
  // ['employees.view', 'shifts.view'] — exactly what the backend stores in
  // BusinessEmployee.permissions[] (Module 01 canonical catalog).
  const [permDraft, setPermDraft] = useState([]);
  const [permCatalog, setPermCatalog] = useState(null);

  const load = async () => {
    try {
      const [empRes, dashRes, shiftRes, swapRes, torRes, permRes] = await Promise.all([
        employeeApi.list(),
        employeeApi.dashboard(),
        employeeApi.getShifts(currentWeekRange()),
        employeeApi.swapRequests(),
        employeeApi.timeOffRequests(),
        employeeApi.permissionTemplates(),
      ]);
      const emps = empRes?.employees || [];
      setEmployees(emps);
      // /dashboard/employee-stats returns { stats: { totalEmployees,
      // activeShifts, pendingTimeOff, monthlyPayroll } }. avgRating is not
      // part of that payload — compute it from the employee rows.
      const stats = dashRes?.stats || {};
      const rated = emps.filter((e) => Number(e.ratingCount) > 0);
      const avgRating = rated.length
        ? rated.reduce((sum, e) => sum + Number(e.rating || 0), 0) / rated.length
        : null;
      setDashboard({
        activeCount: stats.totalEmployees ?? 0,
        onShiftNow: stats.activeShifts ?? 0,
        monthlyPayrollUsdc: stats.monthlyPayroll != null ? Number(stats.monthlyPayroll) : 0,
        pendingTimeOff: stats.pendingTimeOff ?? 0,
        avgRating,
      });
      setShifts(shiftRes?.shifts || []);
      setSwapRequests(swapRes?.swaps || []);
      setTimeOffRequests(torRes?.requests || []);
      setPermCatalog(permRes?.permissionKeys || null);
    } catch (err) {
      toast.error('Failed to load employee data');
    }
  };

  useEffect(() => { load(); }, []);

  // Map the form to the backend's addEmployee payload vocabulary: jobTitle
  // -> title, monthlySalaryUsdc -> salaryAmount, hourlyRateUsdc -> hourlyRate,
  // payrollType uses the Prisma PayrollType enum, permissions is the dotted
  // key array (no booleans).
  const formToPayload = () => ({
    azmId: form.azmId,
    role: form.role,
    title: form.jobTitle || undefined,
    payrollType: form.payrollType,
    salaryAmount: form.payrollType === 'SALARY' && form.monthlySalaryUsdc ? Number(form.monthlySalaryUsdc) : null,
    hourlyRate: form.payrollType === 'HOURLY' && form.hourlyRateUsdc ? Number(form.hourlyRateUsdc) : null,
    permissions: permDraft,
  });

  const resetForm = () => {
    setForm({ azmId: '', role: 'STAFF', jobTitle: '', monthlySalaryUsdc: '', hourlyRateUsdc: '', payrollType: 'SALARY' });
    setPermDraft([]);
  };

  const handleAdd = async () => {
    try {
      await employeeApi.create(formToPayload());
      toast.success('Employee added successfully');
      setAddOpen(false);
      resetForm();
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to add employee');
    }
  };

  const handleEdit = async () => {
    try {
      await employeeApi.update(editEmp.id, formToPayload());
      toast.success('Employee updated');
      setEditEmp(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to update employee');
    }
  };

  const handleAction = async (emp, action) => {
    const actions = {
      suspend: () => employeeApi.update(emp.id, { status: 'SUSPENDED' }),
      reinstate: () => employeeApi.update(emp.id, { status: 'ACTIVE' }),
      terminate: () => employeeApi.update(emp.id, { status: 'TERMINATED' }),
      remove: () => employeeApi.remove(emp.id),
    };
    try {
      await actions[action]();
      toast.success(`Employee ${action}d`);
      load();
    } catch (err) {
      toast.error(`Failed to ${action} employee`);
    }
  };

  const openEdit = (emp) => {
    setEditEmp(emp);
    setForm({
      azmId: emp.user?.username || '',
      role: emp.role,
      jobTitle: emp.title || '',
      monthlySalaryUsdc: emp.salaryAmount != null ? String(emp.salaryAmount) : '',
      hourlyRateUsdc: emp.hourlyRate != null ? String(emp.hourlyRate) : '',
      payrollType: emp.payrollType || 'SALARY',
    });
    // permissions is the stored dotted-key array (legacy snake_case rows are
    // normalized by the backend on read of new writes, not here).
    setPermDraft(Array.isArray(emp.permissions) ? emp.permissions : []);
  };

  const tabs = [
    { label: 'Team', icon: Users, count: employees?.length, content: <TeamGrid employees={employees} onEdit={openEdit} onAction={handleAction} loading={!employees} /> },
    { label: 'Schedule', icon: Calendar, count: shifts?.length, content: <ScheduleTab shifts={shifts} loading={!shifts} /> },
    { label: 'Swap Requests', icon: CheckCircle2, count: swapRequests?.length, content: <SwapTab swaps={swapRequests} onApprove={async (id) => { await employeeApi.approveSwap(id); toast.success('Swap approved'); load(); }} onReject={async (id) => { await employeeApi.rejectSwap(id); toast.info('Swap rejected'); load(); }} loading={!swapRequests} /> },
    { label: 'Time Off', icon: Clock, count: timeOffRequests?.length, content: <TimeOffTab requests={timeOffRequests} onApprove={async (id) => { await employeeApi.approveTimeOff(id); toast.success('Time off approved'); load(); }} onReject={async (id) => { await employeeApi.rejectTimeOff(id); toast.info('Time off rejected'); load(); }} loading={!timeOffRequests} /> },
    { label: 'Payroll', icon: DollarSign, content: <PayrollTab onRunPayroll={async (data) => { await employeeApi.runPayroll(data); toast.success('Payroll executed — Smart Routes dispatched'); load(); }} loading={!dashboard} /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--sn-text)]">Employee Management</h1>
          <p className="text-sm text-[var(--sn-text-muted)] mt-0.5">Manage your team, schedules, payroll, and more</p>
        </div>
        <Button onClick={() => setAddOpen(true)}><UserPlus className="w-4 h-4" /> Add Employee</Button>
      </div>

      {/* Dashboard stats */}
      {dashboard && (
        <div className="grid grid-cols-4 gap-4">
          <Card><p className="text-xs text-[var(--sn-text-muted)] uppercase mb-1">Active</p><p className="text-2xl font-bold text-[var(--sn-text)]">{dashboard.activeCount}</p></Card>
          <Card><p className="text-xs text-[var(--sn-text-muted)] uppercase mb-1">On Shift Now</p><p className="text-2xl font-bold text-[var(--sn-purple)]">{dashboard.onShiftNow}</p></Card>
          <Card><p className="text-xs text-[var(--sn-text-muted)] uppercase mb-1">Monthly Payroll</p><p className="text-2xl font-bold text-[var(--sn-text)]">{dashboard.monthlyPayrollUsdc?.toFixed(2)} USDC</p></Card>
          <Card><p className="text-xs text-[var(--sn-text-muted)] uppercase mb-1">Avg Rating</p><p className="text-2xl font-bold text-[var(--sn-amber)]">{dashboard.avgRating?.toFixed(1)} ★</p></Card>
        </div>
      )}

      {/* Tabs */}
      <EmployeeTabs tabs={tabs} active={tab} onChange={setTab} />

      {/* Add Employee Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Employee by AZM-ID">
        <EmployeeForm form={form} setForm={setForm} permDraft={permDraft} setPermDraft={setPermDraft} onSubmit={handleAdd} submitLabel="Add Employee" catalog={permCatalog} />
      </Modal>

      {/* Edit Employee Modal */}
      <Modal open={!!editEmp} onClose={() => setEditEmp(null)} title={`Edit ${editEmp?.user?.fullName || editEmp?.user?.username || 'Employee'}`}>
        {editEmp && <EmployeeForm form={form} setForm={setForm} permDraft={permDraft} setPermDraft={setPermDraft} onSubmit={handleEdit} submitLabel="Save Changes" catalog={permCatalog} />}
      </Modal>
    </div>
  );
}

function EmployeeTabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 p-1 rounded-xl border border-[var(--sn-border)] bg-[var(--sn-surface)]">
      {tabs.map((tab, i) => (
        <button
          key={i}
          onClick={() => onChange(i)}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${active === i ? 'bg-[var(--sn-purple-subtle)] text-[var(--sn-purple)] border border-[var(--sn-purple-border)]' : 'text-[var(--sn-text-muted)] hover:text-[var(--sn-text-secondary)]'}`}
        >
          {tab.icon && <tab.icon className="w-4 h-4 inline mr-1.5" />}
          {tab.label}
          {tab.count !== undefined && tab.count > 0 && (
            <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-[var(--sn-border)] text-[var(--sn-text-muted)]">{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

function EmployeeForm({ form, setForm, permDraft, setPermDraft, onSubmit, submitLabel, catalog }) {
  // Group the canonical catalog ({ Module: [{key,label},...] }) into
  // render-ready groups; fall back to nothing if the backend catalog is
  // unavailable (role template defaults still apply server-side).
  const permGroups = catalog
    ? Object.entries(catalog).map(([module, items]) => ({ module, items }))
    : [];
  return (
    <div className="space-y-4">
      <Input label="Employee AZM-ID" placeholder="Their Azaman @username or email" value={form.azmId} onChange={e => setForm({ ...form, azmId: e.target.value })} />
      <div className="grid grid-cols-2 gap-4">
        <Select label="Role" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} options={ROLES} />
        <Input label="Job Title" placeholder="e.g. Front Desk Agent" value={form.jobTitle} onChange={e => setForm({ ...form, jobTitle: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Monthly Salary (USDC)" type="number" placeholder="e.g. 500" value={form.monthlySalaryUsdc} onChange={e => setForm({ ...form, monthlySalaryUsdc: e.target.value })} />
        <Input label="Hourly Rate (USDC)" type="number" placeholder="e.g. 3.50" value={form.hourlyRateUsdc} onChange={e => setForm({ ...form, hourlyRateUsdc: e.target.value })} />
      </div>
      <Select label="Pay Type" value={form.payrollType} onChange={e => setForm({ ...form, payrollType: e.target.value })} options={PAYROLL_TYPES} />

      {permGroups.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[var(--sn-text-muted)] uppercase tracking-wider mb-3">Permissions</p>
          <div className="space-y-3">
            {permGroups.map(group => (
              <div key={group.module}>
                <p className="text-[10px] font-bold text-[var(--sn-text-muted)] uppercase tracking-widest mb-2">{group.module}</p>
                <div className="grid grid-cols-2 gap-3">
                  {group.items.map(p => (
                    <Switch
                      key={p.key}
                      label={p.label}
                      checked={permDraft.includes(p.key)}
                      onChange={(on) => setPermDraft(on ? [...permDraft, p.key] : permDraft.filter((k) => k !== p.key))}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {permGroups.length === 0 && (
        <p className="text-xs text-[var(--sn-text-muted)]">Role defaults will be applied. No permissions selected.</p>
      )}

      <Button onClick={onSubmit} className="w-full">{submitLabel}</Button>
      <p className="text-xs text-[var(--sn-text-muted)] text-center">The employee will set their own Smart Route payout preferences in their Azaman app.</p>
    </div>
  );
}

function TeamGrid({ employees, onEdit, onAction, loading }) {
  if (loading) return <div className="grid grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40" />)}</div>;
  if (!employees?.length) return <Empty icon={Users} title="No employees yet" description="Add your first team member by their AZM-ID" />;

  return (
    <div className="grid grid-cols-3 gap-4">
      {employees.map(emp => (
        <Card key={emp.id} hover>
          <div className="flex items-start gap-3 mb-4">
            <Avatar name={emp.user?.fullName || emp.user?.username} size="lg" online={emp.status === 'ACTIVE'} />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[var(--sn-text)] truncate">{emp.user?.fullName || emp.user?.username || 'Employee'}</p>
              <p className="text-xs text-[var(--sn-text-muted)] truncate">{emp.title || emp.role}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge color={STATUS_COLORS[emp.status]}>{emp.status}</Badge>
                <Badge color="var(--sn-text-muted)">{emp.role}</Badge>
              </div>
            </div>
            <DropdownMenu
              trigger={<button className="p-1.5 rounded-lg hover:bg-[var(--sn-card-hover)] text-[var(--sn-text-muted)]"><MoreVertical className="w-4 h-4" /></button>}
              items={[
                { label: 'Edit', icon: Edit2, onClick: () => onEdit(emp) },
                emp.status === 'ACTIVE' ? { label: 'Suspend', icon: Ban, danger: true, onClick: () => onAction(emp, 'suspend') } : { label: 'Reinstate', icon: CheckCircle2, onClick: () => onAction(emp, 'reinstate') },
                { divider: true },
                { label: 'Terminate', icon: Trash2, danger: true, onClick: () => onAction(emp, 'terminate') },
              ]}
            />
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[var(--sn-text-muted)]">Salary</span>
              <span className="text-[var(--sn-text)] font-semibold">{emp.salaryAmount ? `${emp.salaryAmount} USDC/mo` : emp.hourlyRate ? `${emp.hourlyRate} USDC/hr` : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--sn-text-muted)]">Rating</span>
              <span className="text-[var(--sn-amber)] font-semibold">{emp.rating?.toFixed(1) || '—'} ★</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--sn-text-muted)]">Shifts this month</span>
              <span className="text-[var(--sn-text)] font-semibold">{emp.totalShifts || 0}</span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function ScheduleTab({ shifts, loading }) {
  if (loading) return <Skeleton className="h-64" />;
  if (!shifts?.length) return <Empty icon={Calendar} title="No shifts scheduled" description="Create shifts to manage your team's schedule" />;
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const byDay = days.map(day => shifts.filter(s => new Date(s.startTime).toLocaleDateString('en', { weekday: 'short' }) === day));

  return (
    <div className="grid grid-cols-7 gap-3">
      {byDay.map((dayShifts, i) => (
        <div key={i} className="space-y-2">
          <p className="text-xs font-bold text-[var(--sn-text-muted)] uppercase text-center pb-2 border-b border-[var(--sn-border)]">{days[i]}</p>
          {dayShifts.map(shift => (
            <Card key={shift.id} className="p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <Avatar name={shift.employee?.user?.fullName || shift.employee?.user?.username} size="xs" />
                <span className="text-xs font-semibold text-[var(--sn-text)] truncate">{shift.employee?.user?.fullName || shift.employee?.user?.username}</span>
              </div>
              <p className="text-xs text-[var(--sn-text-muted)]">{new Date(shift.startTime).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })} — {new Date(shift.endTime).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}</p>
              {shift.clockInTime && <Badge color="var(--sn-purple)" className="mt-1.5 text-[10px]">Clocked in</Badge>}
            </Card>
          ))}
        </div>
      ))}
    </div>
  );
}

function SwapTab({ swaps, onApprove, onReject, loading }) {
  if (loading) return <Skeleton className="h-40" />;
  if (!swaps?.length) return <Empty icon={CheckCircle2} title="No swap requests" description="Shift swap requests from employees will appear here" />;
  return (
    <div className="space-y-3">
      {swaps.map(swap => (
        <Card key={swap.id} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar name={swap.requestingEmployee?.user?.username || 'Staff'} size="sm" />
            <div>
              <p className="text-sm font-semibold text-[var(--sn-text)]">
                {swap.requestingEmployee?.user?.username} wants to swap
                {swap.claimingEmployee?.user?.username ? ` with ${swap.claimingEmployee.user.username}` : ' (open to claim)'}
              </p>
              <p className="text-xs text-[var(--sn-text-muted)]">
                {new Date(swap.requestingShift?.startTime || swap.createdAt).toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => onReject(swap.id)}>Reject</Button>
            <Button size="sm" onClick={() => onApprove(swap.id)}>Approve</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function TimeOffTab({ requests, onApprove, onReject, loading }) {
  if (loading) return <Skeleton className="h-40" />;
  if (!requests?.length) return <Empty icon={Clock} title="No time-off requests" />;
  return (
    <div className="space-y-3">
      {requests.map(req => (
        <Card key={req.id} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar name={req.employee?.user?.fullName || req.employee?.user?.username} size="sm" />
            <div>
              <p className="text-sm font-semibold text-[var(--sn-text)]">{req.employee?.user?.fullName || req.employee?.user?.username}</p>
              <p className="text-xs text-[var(--sn-text-muted)]">{req.type} • {new Date(req.startDate).toLocaleDateString('en')} — {new Date(req.endDate).toLocaleDateString('en')}</p>
              {req.reason && <p className="text-xs text-[var(--sn-text-muted)] mt-0.5">"{req.reason}"</p>}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => onReject(req.id)}>Reject</Button>
            <Button size="sm" onClick={() => onApprove(req.id)}>Approve</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function PayrollTab({ onRunPayroll, loading }) {
  // payrollService expects period 'YYYY-MM' (PayrollRecord is unique per
  // employee+period). Default to the current month.
  const now = new Date();
  const [period, setPeriod] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  return (
    <Card>
      <div className="text-center py-6">
        <div className="w-16 h-16 rounded-2xl bg-[var(--sn-purple-subtle)] border border-[var(--sn-purple-border)] flex items-center justify-center mx-auto mb-4">
          <DollarSign className="w-8 h-8 text-[var(--sn-purple)]" />
        </div>
        <h3 className="text-lg font-bold text-[var(--sn-text)] mb-1">Run Payroll</h3>
        <p className="text-sm text-[var(--sn-text-muted)] max-w-md mx-auto mb-6">Azaman will execute Smart Routes for all active employees, paying each worker to their preferred destination (MoMo, wallet, or savings) automatically.</p>
        <Input label="Payroll Period (YYYY-MM)" value={period} onChange={(e) => setPeriod(e.target.value)} className="max-w-xs mx-auto mb-4" />
        <Button size="lg" onClick={() => onRunPayroll({ period })} loading={loading}>Execute Payroll</Button>
      </div>
    </Card>
  );
}
