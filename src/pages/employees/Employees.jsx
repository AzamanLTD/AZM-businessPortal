import { useState, useEffect } from 'react';
import { employeeApi } from '@/lib/marketplaceApi';
import { usePermission } from '@/hooks/usePermission';
import {
  Card,
  Button,
  Badge,
  Input,
  Select,
  Modal,
  Empty,
  Skeleton,
  Avatar,
  DropdownMenu,
  Tooltip,
  Switch,
  StatCard,
  Textarea
} from '@/components/ui';
import { useToast } from '@/components/forge';
import { VirtualizedGrid } from '@/components/ui/VirtualizedGrid';
import {
  Users,
  UserPlus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  Mail,
  Phone,
  Star,
  Clock,
  Calendar,
  DollarSign,
  Ban,
  CheckCircle2,
  Filter
} from 'lucide-react';

const ROLES = [
  { value: 'OWNER', label: 'Owner' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'SUPERVISOR', label: 'Supervisor' },
  { value: 'STAFF', label: 'Staff' },
  { value: 'TRAINEE', label: 'Trainee' },
];

const STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'TERMINATED', label: 'Terminated' },
];

const PAYROLL_TYPES = [
  { value: 'SALARY', label: 'Salary' },
  { value: 'HOURLY', label: 'Hourly' },
];

const STATUS_COLORS = {
  ACTIVE: 'var(--f-tint-color)',
  SUSPENDED: 'var(--f-warn)',
  TERMINATED: 'var(--f-bad)',
};

const AVAILABLE_PERMISSIONS = [
  { value: 'employees.view', label: 'View Employees' },
  { value: 'employees.create', label: 'Add Employees' },
  { value: 'employees.manage', label: 'Manage Employees' },
  { value: 'employees.permissions', label: 'Update Permissions' },
];

export default function Employees() {
  const { toast } = useToast();
  const { hasPermission } = usePermission();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPermsOpen, setIsPermsOpen] = useState(false);
  const [isSelectedOpen, setIsSelectedOpen] = useState(false);

  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Form States
  const [addForm, setAddForm] = useState({
    azmId: '',
    role: 'STAFF',
    title: '',
    department: '',
    payrollType: 'HOURLY',
    salaryAmount: '',
    hourlyRate: '',
    paymentPreference: 'USDC',
  });

  const [editForm, setEditForm] = useState({
    role: 'STAFF',
    title: '',
    department: '',
    payrollType: 'HOURLY',
    salaryAmount: '',
    hourlyRate: '',
    paymentPreference: 'USDC',
  });

  const [permissionsForm, setPermissionsForm] = useState([]);

  // Fetch employees
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await employeeApi.list();
      setEmployees(res.data?.employees || []);
    } catch (err) {
      toast.error('Failed to load employee directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Filtered employees for local display (search + dropdown filters)
  const filteredEmployees = employees.filter((emp) => {
    const name = emp.user?.fullName || '';
    const email = emp.user?.email || '';
    const matchesSearch =
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'ALL' || emp.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || emp.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Calculate Stat Cards
  const totalEmployees = employees.length;
  const activeCount = employees.filter((e) => e.status === 'ACTIVE').length;
  const suspendedCount = employees.filter((e) => e.status === 'SUSPENDED').length;
  const avgRating =
    employees.length > 0
      ? employees.reduce((sum, e) => sum + (e.rating || 0), 0) / employees.length
      : 0;

  // Add Employee Submission
  const handleAddEmployee = async () => {
    try {
      const payload = {
        azmId: addForm.azmId,
        role: addForm.role,
        title: addForm.title,
        department: addForm.department,
        payrollType: addForm.payrollType,
        salaryAmount: addForm.payrollType === 'SALARY' ? parseFloat(addForm.salaryAmount || 0) : undefined,
        hourlyRate: addForm.payrollType === 'HOURLY' ? parseFloat(addForm.hourlyRate || 0) : undefined,
        paymentPreference: addForm.paymentPreference,
      };

      await employeeApi.create(payload);
      toast.success('Employee added successfully');
      setIsAddOpen(false);
      // Reset form
      setAddForm({
        azmId: '',
        role: 'STAFF',
        title: '',
        department: '',
        payrollType: 'HOURLY',
        salaryAmount: '',
        hourlyRate: '',
        paymentPreference: 'USDC',
      });
      fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add employee');
    }
  };

  // Edit Employee Submission
  const handleEditEmployee = async () => {
    try {
      const payload = {
        role: editForm.role,
        title: editForm.title,
        department: editForm.department,
        payrollType: editForm.payrollType,
        salaryAmount: editForm.payrollType === 'SALARY' ? parseFloat(editForm.salaryAmount || 0) : undefined,
        hourlyRate: editForm.payrollType === 'HOURLY' ? parseFloat(editForm.hourlyRate || 0) : undefined,
        paymentPreference: editForm.paymentPreference,
      };

      await employeeApi.update(selectedEmployee.id, payload);
      toast.success('Employee updated successfully');
      setIsEditOpen(false);
      if (isSelectedOpen) {
        // Update selected view modal too
        setSelectedEmployee((prev) => ({ ...prev, ...payload }));
      }
      fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update employee');
    }
  };

  // Permissions Submission
  const handleUpdatePermissions = async () => {
    try {
      await employeeApi.updatePermissions(selectedEmployee.id, permissionsForm);
      toast.success('Permissions updated successfully');
      setIsPermsOpen(false);
      fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update permissions');
    }
  };

  // Terminate Employee Action
  const handleTerminateEmployee = async (id) => {
    try {
      await employeeApi.remove(id);
      toast.success('Employee terminated successfully');
      if (isSelectedOpen && selectedEmployee?.id === id) {
        setIsSelectedOpen(false);
      }
      fetchEmployees();
    } catch (err) {
      toast.error('Failed to terminate employee');
    }
  };

  // Suspend/Reactivate status toggle
  const handleToggleStatus = async (emp) => {
    try {
      const nextStatus = emp.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      await employeeApi.update(emp.id, { status: nextStatus });
      toast.success(`Employee ${nextStatus === 'ACTIVE' ? 'reactivated' : 'suspended'}`);
      fetchEmployees();
    } catch (err) {
      toast.error('Failed to update employee status');
    }
  };

  // Set up forms for selected user
  const openEditModal = (emp) => {
    setSelectedEmployee(emp);
    setEditForm({
      role: emp.role || 'STAFF',
      title: emp.title || '',
      department: emp.department || '',
      payrollType: emp.payrollType || 'HOURLY',
      salaryAmount: emp.salaryAmount || '',
      hourlyRate: emp.hourlyRate || '',
      paymentPreference: emp.paymentPreference || 'USDC',
    });
    setIsEditOpen(true);
  };

  const openPermissionsModal = (emp) => {
    setSelectedEmployee(emp);
    setPermissionsForm(emp.permissions || []);
    setIsPermsOpen(true);
  };

  const togglePermission = (perm) => {
    setPermissionsForm((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const canCreate = hasPermission('employees.create');
  const canManage = hasPermission('employees.manage');
  const canPermissions = hasPermission('employees.permissions');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--f-text)]">Employees</h1>
          <p className="text-sm text-[var(--f-text-3)] mt-0.5">
            Manage roles, compensation, schedules, and permissions
          </p>
        </div>
        {canCreate && (
          <Button data-tour="employees-add" onClick={() => setIsAddOpen(true)}>
            <UserPlus className="w-4 h-4" /> Add Employee
          </Button>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Employees"
          value={totalEmployees}
          icon={Users}
          loading={loading}
        />
        <StatCard
          label="Active Now"
          value={activeCount}
          icon={CheckCircle2}
          color="var(--f-tint-color)"
          loading={loading}
        />
        <StatCard
          label="Suspended"
          value={suspendedCount}
          icon={Ban}
          color="var(--f-warn)"
          loading={loading}
        />
        <StatCard
          label="Avg Rating"
          value={avgRating > 0 ? `${avgRating.toFixed(1)} ★` : '—'}
          icon={Star}
          color="var(--f-warn)"
          loading={loading}
        />
      </div>

      {/* Filter Bar */}
      <Card className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--f-text-3)]" />
          <Input
            placeholder="Search by name or email..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            options={[{ value: 'ALL', label: 'All Roles' }, ...ROLES]}
            className="w-full md:w-44"
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[{ value: 'ALL', label: 'All Statuses' }, ...STATUSES]}
            className="w-full md:w-44"
          />
        </div>
      </Card>

      {/* Employee Grid */}
      {loading ? (
        <div data-tour="employees-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : filteredEmployees.length === 0 ? (
        <Empty
          icon={Users}
          description="Try adjusting your filters or search query."
        />
      ) : (
        <div style={{ height: 'calc(100vh - 380px)', minHeight: '400px' }} className="rounded-2xl">
        <VirtualizedGrid
          items={filteredEmployees}
          columnCount={3}
          estimateRowHeight={220}
          gap={24}
          renderItem={(emp) => {
            const user = emp.user || {};
            const isSuspended = emp.status === 'SUSPENDED';
            const isTerminated = emp.status === 'TERMINATED';

            return (
              <Card
                key={emp.id}
                hover
                onClick={() => {
                  setSelectedEmployee(emp);
                  setIsSelectedOpen(true);
                }}
                className="relative group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={user.avatarUrl}
                        name={user.fullName || user.username}
                        size="lg"
                      />
                      <div>
                        <h3 className="font-bold text-[var(--f-text)] truncate max-w-[150px]">
                          {user.fullName || user.username || 'Unnamed'}
                        </h3>
                        <p className="text-xs text-[var(--f-text-3)] truncate max-w-[150px]">
                          {emp.title || 'No Title'}
                        </p>
                      </div>
                    </div>

                    <div onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu
                        trigger={
                          <button className="p-1.5 rounded-lg hover:bg-[var(--f-surface-sunken)] text-[var(--f-text-3)]">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        }
                        items={[
                          ...(canManage
                            ? [
                                {
                                  label: 'Edit Info',
                                  icon: Edit2,
                                  onClick: () => openEditModal(emp),
                                },
                                {
                                  label: isSuspended ? 'Reactivate' : 'Suspend',
                                  icon: isSuspended ? CheckCircle2 : Ban,
                                  onClick: () => handleToggleStatus(emp),
                                },
                              ]
                            : []),
                          ...(canPermissions
                            ? [
                                {
                                  label: 'Update Permissions',
                                  icon: Filter,
                                  onClick: () => openPermissionsModal(emp),
                                },
                              ]
                            : []),
                          ...(canManage && !isTerminated
                            ? [
                                { divider: true },
                                {
                                  label: 'Terminate',
                                  icon: Trash2,
                                  danger: true,
                                  onClick: () => handleTerminateEmployee(emp.id),
                                },
                              ]
                            : []),
                        ]}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge color={STATUS_COLORS[emp.status] || 'var(--f-text-3)'}>
                      {emp.status}
                    </Badge>
                    <Badge color="var(--f-tint-color)">{emp.role}</Badge>
                    {emp.department && (
                      <Badge color="var(--f-text-3)">{emp.department}</Badge>
                    )}
                  </div>
                </div>

                <div className="border-t border-[var(--f-line)] pt-4 mt-auto space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-[var(--f-text-3)]">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{emp.totalHours || 0} hrs worked</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[var(--f-text-3)] justify-end">
                      <Star className="w-3.5 h-3.5 text-[var(--f-warn)]" />
                      <span className="font-semibold text-[var(--f-text)]">
                        {emp.rating ? emp.rating.toFixed(1) : '—'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[var(--f-text-3)]">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{emp.totalShifts || 0} shifts</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[var(--f-text-3)] justify-end">
                      <DollarSign className="w-3.5 h-3.5" />
                      <span className="font-semibold text-[var(--f-text)]">
                        {emp.payrollType === 'SALARY'
                          ? `${emp.salaryAmount || 0}/mo`
                          : `${emp.hourlyRate || 0}/hr`}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          }}
        />
        </div>
      )}

      {/* Details Modal */}
      <Modal
        open={isSelectedOpen}
        onClose={() => setIsSelectedOpen(false)}
        title="Employee Details"
      >
        {selectedEmployee && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar
                src={selectedEmployee.user?.avatarUrl}
                name={selectedEmployee.user?.fullName}
                size="lg"
              />
              <div>
                <h2 className="text-lg font-bold text-[var(--f-text)]">
                  {selectedEmployee.user?.fullName || selectedEmployee.user?.username}
                </h2>
                <p className="text-sm text-[var(--f-text-3)]">
                  {selectedEmployee.title} • {selectedEmployee.department}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge color={STATUS_COLORS[selectedEmployee.status]}>
                    {selectedEmployee.status}
                  </Badge>
                  <Badge color="var(--f-tint-color)">{selectedEmployee.role}</Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-b border-[var(--f-line)] py-4">
              <div className="space-y-1">
                <span className="text-xs text-[var(--f-text-3)] block uppercase font-semibold">
                  Compensation
                </span>
                <span className="text-sm text-[var(--f-text)] font-semibold">
                  {selectedEmployee.payrollType === 'SALARY'
                    ? `${selectedEmployee.salaryAmount || 0} USDC / month`
                    : `${selectedEmployee.hourlyRate || 0} USDC / hour`}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-[var(--f-text-3)] block uppercase font-semibold">
                  Hire Date
                </span>
                <span className="text-sm text-[var(--f-text)]">
                  {selectedEmployee.hireDate
                    ? new Date(selectedEmployee.hireDate).toLocaleDateString()
                    : '—'}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-[var(--f-text-3)] block uppercase font-semibold">
                  Email
                </span>
                <span className="text-sm text-[var(--f-text)] flex items-center gap-1 truncate">
                  <Mail className="w-3.5 h-3.5 text-[var(--f-text-3)]" />
                  {selectedEmployee.user?.email || '—'}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-[var(--f-text-3)] block uppercase font-semibold">
                  Rating
                </span>
                <span className="text-sm text-[var(--f-warn)] flex items-center gap-1 font-semibold">
                  <Star className="w-3.5 h-3.5 fill-[var(--f-warn)]" />
                  {selectedEmployee.rating ? selectedEmployee.rating.toFixed(1) : 'No reviews'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-xl bg-[var(--f-surface)] border border-[var(--f-line)]">
                <p className="text-xs text-[var(--f-text-3)] font-semibold">SHIFTS</p>
                <p className="text-lg font-bold text-[var(--f-text)] mt-1">
                  {selectedEmployee.totalShifts || 0}
                </p>
              </div>
              <div className="text-center p-3 rounded-xl bg-[var(--f-surface)] border border-[var(--f-line)]">
                <p className="text-xs text-[var(--f-text-3)] font-semibold">HOURS</p>
                <p className="text-lg font-bold text-[var(--f-text)] mt-1">
                  {selectedEmployee.totalHours || 0}
                </p>
              </div>
              <div className="text-center p-3 rounded-xl bg-[var(--f-surface)] border border-[var(--f-line)]">
                <p className="text-xs text-[var(--f-text-3)] font-semibold">DELAYS</p>
                <p className="text-lg font-bold text-[var(--f-bad)] mt-1">
                  {selectedEmployee.lateCount || 0} Late / {selectedEmployee.noShowCount || 0} No-Show
                </p>
              </div>
            </div>

            {selectedEmployee.permissions && selectedEmployee.permissions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-[var(--f-text-3)] uppercase font-semibold">
                  Permissions
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedEmployee.permissions.map((perm) => (
                    <Badge key={perm} color="var(--f-tint-color)">
                      {perm}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setIsSelectedOpen(false)}>
                Close
              </Button>
              {canManage && (
                <Button onClick={() => openEditModal(selectedEmployee)}>
                  <Edit2 className="w-4 h-4" /> Edit Profile
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Add Modal */}
      <Modal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add New Employee"
      >
        <div className="space-y-4">
          <Input
            label="AZM Username (e.g. username)"
            placeholder="Search by username..."
            value={addForm.azmId}
            onChange={(e) => setAddForm({ ...addForm, azmId: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Role"
              value={addForm.role}
              onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
              options={ROLES}
            />
            <Input
              label="Job Title"
              placeholder="e.g. Front Desk Manager"
              value={addForm.title}
              onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Department"
              placeholder="e.g. Operations"
              value={addForm.department}
              onChange={(e) => setAddForm({ ...addForm, department: e.target.value })}
            />
            <Select
              label="Payroll Type"
              value={addForm.payrollType}
              onChange={(e) => setAddForm({ ...addForm, payrollType: e.target.value })}
              options={PAYROLL_TYPES}
            />
          </div>
          {addForm.payrollType === 'SALARY' ? (
            <Input
              label="Monthly Salary (USDC)"
              type="number"
              placeholder="e.g. 3000"
              value={addForm.salaryAmount}
              onChange={(e) => setAddForm({ ...addForm, salaryAmount: e.target.value })}
            />
          ) : (
            <Input
              label="Hourly Rate (USDC)"
              type="number"
              placeholder="e.g. 15"
              value={addForm.hourlyRate}
              onChange={(e) => setAddForm({ ...addForm, hourlyRate: e.target.value })}
            />
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--f-line)]">
            <Button variant="secondary" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddEmployee}>Create Employee</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Employee Profile"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Role"
              value={editForm.role}
              onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
              options={ROLES}
            />
            <Input
              label="Job Title"
              placeholder="e.g. Front Desk Manager"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Department"
              placeholder="e.g. Operations"
              value={editForm.department}
              onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
            />
            <Select
              label="Payroll Type"
              value={editForm.payrollType}
              onChange={(e) => setEditForm({ ...editForm, payrollType: e.target.value })}
              options={PAYROLL_TYPES}
            />
          </div>
          {editForm.payrollType === 'SALARY' ? (
            <Input
              label="Monthly Salary (USDC)"
              type="number"
              placeholder="e.g. 3000"
              value={editForm.salaryAmount}
              onChange={(e) => setEditForm({ ...editForm, salaryAmount: e.target.value })}
            />
          ) : (
            <Input
              label="Hourly Rate (USDC)"
              type="number"
              placeholder="e.g. 15"
              value={editForm.hourlyRate}
              onChange={(e) => setEditForm({ ...editForm, hourlyRate: e.target.value })}
            />
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--f-line)]">
            <Button variant="secondary" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditEmployee}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* Permissions Modal */}
      <Modal
        open={isPermsOpen}
        onClose={() => setIsPermsOpen(false)}
        title="Update Employee Permissions"
      >
        <div className="space-y-4">
          <p className="text-xs text-[var(--f-text-3)] mb-4">
            Grant or restrict explicit permissions for {selectedEmployee?.user?.fullName || selectedEmployee?.user?.username}.
          </p>

          <div className="space-y-3">
            {AVAILABLE_PERMISSIONS.map((perm) => {
              const isChecked = permissionsForm.includes(perm.value);
              return (
                <div
                  key={perm.value}
                  className="flex items-center justify-between p-3 rounded-xl bg-[var(--f-surface)] border border-[var(--f-line)]"
                >
                  <div>
                    <p className="text-sm font-semibold text-[var(--f-text)]">
                      {perm.label}
                    </p>
                    <p className="text-xs text-[var(--f-text-3)]">
                      {perm.value}
                    </p>
                  </div>
                  <Switch
                    checked={isChecked}
                    onChange={() => togglePermission(perm.value)}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--f-line)]">
            <Button variant="secondary" onClick={() => setIsPermsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePermissions}>Save Permissions</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
