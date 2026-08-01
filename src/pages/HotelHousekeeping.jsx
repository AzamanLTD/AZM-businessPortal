import { useState, useEffect, useCallback, useRef } from 'react';
import { hotelOpsApi, employeeApi } from '@/lib/marketplaceApi';
import {
  Card,
  Button,
  Badge,
  Skeleton,
  Empty,
  Modal,
  Input,
  Select,
  Avatar,
  StatCard
} from '@/components/forge';
import { Switch } from '@/components/forge';
import { usePermission } from '@/hooks/usePermission';
import { request } from '@/lib/apiCore';
import {
  Sparkles,
  Bath,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Plus,
  Filter,
  UserCheck,
  ClipboardList,
  Clock,
  Camera,
  Layers,
  ChevronRight,
  Info,
  CheckSquare,
  Square
} from 'lucide-react';
import { toast } from 'sonner';

const COLUMNS = [
  { key: 'PENDING', label: 'Pending', color: 'var(--f-text-3)', bg: 'rgba(154, 160, 172, 0.15)', icon: Sparkles },
  { key: 'IN_PROGRESS', label: 'In Progress', color: 'var(--f-info)', bg: 'rgba(0, 122, 255, 0.15)', icon: Bath },
  { key: 'AWAITING_INSPECTION', label: 'Awaiting Inspection', color: 'var(--f-warn)', bg: 'rgba(255, 159, 10, 0.15)', icon: ClipboardList },
  { key: 'COMPLETED', label: 'Completed', color: 'var(--f-ok)', bg: 'rgba(48, 209, 88, 0.15)', icon: CheckCircle2 },
  { key: 'FAILED', label: 'Failed', color: 'var(--f-bad)', bg: 'rgba(255, 69, 58, 0.15)', icon: AlertTriangle }
];

const SLA_LIMITS = {
  CHECKOUT_CLEAN: 45 * 60, // 45 min
  DAILY_REFRESH: 30 * 60,  // 30 min
  DEEP_CLEAN: 90 * 60,     // 90 min
  INSPECTION: 20 * 60      // Default/Fallback SLA: 20 min
};

const TASK_TYPE_META = {
  CHECKOUT_CLEAN: { label: 'Checkout Clean', color: 'var(--f-warn)', sla: '45m' },
  DAILY_REFRESH: { label: 'Daily Refresh', color: 'var(--f-info)', sla: '30m' },
  DEEP_CLEAN: { label: 'Deep Clean', color: 'var(--f-tint-color)', sla: '90m' },
  INSPECTION: { label: 'Inspection', color: 'var(--f-text-3)', sla: '20m' }
};

const PRIORITY_META = {
  1: { label: 'URGENT', color: 'var(--f-bad)' },
  2: { label: 'HIGH', color: 'var(--f-warn)' },
  3: { label: 'HIGH', color: 'var(--f-warn)' },
  4: { label: 'HIGH', color: 'var(--f-warn)' },
  5: { label: 'NORMAL', color: 'var(--f-text-3)' }
};

function ElapsedTimer({ task }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const getSeconds = () => {
      const baseTime = task.startedAt || task.createdAt || task.created_date;
      if (!baseTime) return 0;
      return Math.floor((Date.now() - new Date(baseTime).getTime()) / 1000);
    };

    setElapsed(getSeconds());
    const interval = setInterval(() => {
      setElapsed(getSeconds());
    }, 1000);

    return () => clearInterval(interval);
  }, [task.startedAt, task.createdAt, task.created_date]);

  const slaMax = SLA_LIMITS[task.taskType] || SLA_LIMITS.INSPECTION;
  const isOverdue = elapsed > slaMax;

  let timerColor = 'var(--f-ok)';
  if (isOverdue) {
    timerColor = 'var(--f-bad)';
  } else if (elapsed > slaMax * 0.75) {
    timerColor = 'var(--f-warn)';
  }

  const formatTime = (secs) => {
    if (secs < 0) secs = 0;
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h > 0 ? h + 'h ' : ''}${m}m ${s}s`;
  };

  return (
    <div className="flex items-center gap-1.5 mt-2" style={{ color: timerColor }}>
      <Clock className="w-3.5 h-3.5" />
      <span className="text-xs font-mono font-medium">{formatTime(elapsed)}</span>
      {isOverdue && (
        <span className="text-[10px] uppercase font-bold tracking-wider px-1 bg-[var(--f-bad)]/10 text-[var(--f-bad)] rounded">
          Overdue
        </span>
      )}
    </div>
  );
}

export default function HotelHousekeeping() {
    const { hasPermission } = usePermission();

  // Tasks and Employees State
  const [tasks, setTasks] = useState({
    PENDING: [],
    IN_PROGRESS: [],
    AWAITING_INSPECTION: [],
    COMPLETED: [],
    FAILED: []
  });
  const [allTasksRaw, setAllTasksRaw] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [templates, setTemplates] = useState({});
  const [loading, setLoading] = useState(true);

  // Filters State
  const [floorFilter, setFloorFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');

  // Modals State
  const [selectedTask, setSelectedTask] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Create Task Form State
  const [createForm, setCreateForm] = useState({
    roomId: '',
    taskType: 'CHECKOUT_CLEAN',
    priority: 5,
    notes: '',
    useTemplateChecklist: true,
    customChecklist: ''
  });

  // Action input states
  const [inspectionNote, setInspectionNote] = useState('');
  const [isSelfInspect, setIsSelfInspect] = useState(false);

  // Load All Core Data
  const loadData = useCallback(async () => {
    try {
      // 1. Load Tasks
      const tasksRes = await hotelOpsApi.getHousekeepingTasks();
      const rawTasks = tasksRes?.data?.tasks || tasksRes?.tasks || [];
      setAllTasksRaw(rawTasks);

      // Group tasks by status manually to ensure we perfectly align with the columns
      const grouped = {
        PENDING: [],
        IN_PROGRESS: [],
        AWAITING_INSPECTION: [],
        COMPLETED: [],
        FAILED: []
      };

      rawTasks.forEach(t => {
        // Map backend state representations to board columns
        let col = 'PENDING';
        if (t.status === 'IN_PROGRESS' || t.status === 'INPROGRESS') col = 'IN_PROGRESS';
        else if (t.status === 'AWAITING_INSPECTION' || t.status === 'INSPECTED') col = 'AWAITING_INSPECTION';
        else if (t.status === 'COMPLETED' || t.status === 'DONE') col = 'COMPLETED';
        else if (t.status === 'FAILED') col = 'FAILED';
        else if (t.status === 'PENDING') col = 'PENDING';

        if (grouped[col]) {
          grouped[col].push(t);
        }
      });
      setTasks(grouped);

      // Refresh Detail modal if open to pick up update values
      if (selectedTask) {
        const freshTask = rawTasks.find(t => t.id === selectedTask.id);
        if (freshTask) setSelectedTask(freshTask);
      }

      // 2. Load Employees
      const empRes = await employeeApi.list();
      setEmployees(empRes?.employees || empRes?.data?.employees || []);

      // 3. Load Rooms for Creation Dropdown
      const roomsRes = await hotelOpsApi.getRooms();
      setRooms(roomsRes?.rooms || roomsRes?.data?.rooms || []);

      // 4. Load Templates
      const templatesRes = await request('/api/business-os/hotel/housekeeping/templates');
      if (templatesRes && (templatesRes.data || templatesRes.templates)) {
        setTemplates(templatesRes.templates || templatesRes.data || {});
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to reload housekeeping dashboard.');
    } finally {
      setLoading(false);
    }
  }, [selectedTask, toast]);

  // Initial and Polling Loads
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Housekeeper filter dropdown list
  const housekeepers = employees.filter(
    emp => emp.role === 'HOUSEKEEPER' || emp.role?.toUpperCase() === 'HOUSEKEEPER' || emp.permissions?.includes('housekeeping.view')
  );

  // Apply filters on the raw list, then group them for Kanban render
  const getFilteredAndGroupedTasks = () => {
    const filtered = allTasksRaw.filter(t => {
      const roomNum = t.room?.roomNumber || '';
      const floorStr = roomNum.toString().substring(0, 1);
      
      const matchFloor = !floorFilter || floorStr === floorFilter;
      const matchType = !typeFilter || t.taskType === typeFilter;
      const matchAssignee = !assigneeFilter || t.assignedTo?.id === assigneeFilter || t.assignedToId === assigneeFilter;
      
      return matchFloor && matchType && matchAssignee;
    });

    const grouped = {
      PENDING: [],
      IN_PROGRESS: [],
      AWAITING_INSPECTION: [],
      COMPLETED: [],
      FAILED: []
    };

    filtered.forEach(t => {
      let col = 'PENDING';
      if (t.status === 'IN_PROGRESS' || t.status === 'INPROGRESS') col = 'IN_PROGRESS';
      else if (t.status === 'AWAITING_INSPECTION' || t.status === 'INSPECTED') col = 'AWAITING_INSPECTION';
      else if (t.status === 'COMPLETED' || t.status === 'DONE') col = 'COMPLETED';
      else if (t.status === 'FAILED') col = 'FAILED';
      else if (t.status === 'PENDING') col = 'PENDING';

      if (grouped[col]) grouped[col].push(t);
    });

    return grouped;
  };

  const groupedTasks = getFilteredAndGroupedTasks();

  // Helper Stats calculations
  const totalPending = tasks.PENDING.length;
  const totalInProgress = tasks.IN_PROGRESS.length;
  const totalAwaiting = tasks.AWAITING_INSPECTION.length;

  const totalOverdue = allTasksRaw.filter(t => {
    if (t.status === 'COMPLETED' || t.status === 'DONE') return false;
    const baseTime = t.startedAt || t.createdAt || t.created_date;
    if (!baseTime) return false;
    const elapsed = Math.floor((Date.now() - new Date(baseTime).getTime()) / 1000);
    const limit = SLA_LIMITS[t.taskType] || SLA_LIMITS.INSPECTION;
    return elapsed > limit;
  }).length;

  // Actions
  const handleAssign = async (taskId, employeeId) => {
    try {
      await hotelOpsApi.assignTask(taskId, employeeId);
      toast.success('Housekeeper assigned successfully!');
      loadData();
    } catch {
      toast.error('Failed to assign task.');
    }
  };

  const handleAutoAssign = () => {
    if (!selectedTask || housekeepers.length === 0) return;

    // Calculate load (number of non-completed tasks assigned to each housekeeper)
    const loadMap = {};
    housekeepers.forEach(hk => {
      loadMap[hk.id] = 0;
    });

    allTasksRaw.forEach(t => {
      if (t.status !== 'COMPLETED' && t.status !== 'DONE' && t.assignedTo?.id) {
        if (loadMap[t.assignedTo.id] !== undefined) {
          loadMap[t.assignedTo.id]++;
        }
      }
    });

    // Find the housekeeper with the lowest load
    let leastLoaded = housekeepers[0];
    let minLoad = loadMap[leastLoaded.id] || 0;

    housekeepers.forEach(hk => {
      const currentLoad = loadMap[hk.id] || 0;
      if (currentLoad < minLoad) {
        minLoad = currentLoad;
        leastLoaded = hk;
      }
    });

    handleAssign(selectedTask.id, leastLoaded.id);
  };

  const handleUpdateChecklist = async (taskId, updatedChecklist) => {
    try {
      await hotelOpsApi.updateChecklist(taskId, updatedChecklist);
      loadData();
    } catch {
      toast.error('Failed to update checklist item.');
    }
  };

  const handleToggleChecklistItem = (itemIndex) => {
    if (!selectedTask) return;
    const currentChecklist = selectedTask.checklist || [];
    const updated = currentChecklist.map((item, idx) => {
      if (idx === itemIndex) {
        return { ...item, completed: !item.completed };
      }
      return item;
    });
    handleUpdateChecklist(selectedTask.id, updated);
  };

  const handleStartTask = async (taskId) => {
    try {
      // Start task sets the state to IN_PROGRESS via updateChecklist
      await hotelOpsApi.updateChecklist(taskId, { status: 'IN_PROGRESS', startedAt: new Date().toISOString() });
      toast.success('Task started!');
      loadData();
    } catch {
      toast.error('Failed to start task.');
    }
  };

  const handleMarkComplete = async (taskId, selfInspect = false) => {
    try {
      await hotelOpsApi.completeTask(taskId);
      if (selfInspect) {
        // Instantly mark passed
        await hotelOpsApi.inspectTask(taskId, { passed: true, notes: 'Self-inspected' });
        toast.success('Task completed and successfully self-inspected!');
      } else {
        toast.success('Task marked completed and awaiting inspection.');
      }
      loadData();
    } catch {
      toast.error('Failed to mark task complete.');
    }
  };

  const handleInspection = async (taskId, passed) => {
    if (!passed && !inspectionNote.trim()) {
      toast.error('An inspection note is required when failing an inspection.');
      return;
    }
    try {
      await hotelOpsApi.inspectTask(taskId, { passed, notes: inspectionNote });
      toast.success(passed ? 'Task passed inspection!' : 'Task failed inspection.');
      setInspectionNote('');
      loadData();
    } catch {
      toast.error('Failed to submit inspection status.');
    }
  };

  const handleReassignAndRestart = async (taskId, assigneeId) => {
    try {
      if (assigneeId) {
        await hotelOpsApi.assignTask(taskId, assigneeId);
      }
      await hotelOpsApi.updateChecklist(taskId, { status: 'IN_PROGRESS', startedAt: new Date().toISOString() });
      toast.success('Task reassigned and restarted!');
      loadData();
    } catch {
      toast.error('Failed to reassign and restart task.');
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!createForm.roomId) {
      toast.error('Please select a room.');
      return;
    }

    let checklistItems = [];
    if (createForm.useTemplateChecklist) {
      checklistItems = templates[createForm.taskType] || [];
    } else if (createForm.customChecklist.trim()) {
      checklistItems = createForm.customChecklist
        .split('\n')
        .map(x => x.trim())
        .filter(Boolean);
    }

    try {
      await request('/api/business-os/hotel/housekeeping', {
        method: 'POST',
        body: JSON.stringify({
          roomId: createForm.roomId,
          taskType: createForm.taskType,
          priority: Number(createForm.priority),
          notes: createForm.notes,
          checklistItems
        })
      });
      toast.success('Housekeeping task created successfully!');
      setCreateForm({
        roomId: '',
        taskType: 'CHECKOUT_CLEAN',
        priority: 5,
        notes: '',
        useTemplateChecklist: true,
        customChecklist: ''
      });
      setCreateModalOpen(false);
      loadData();
    } catch {
      toast.error('Failed to create task.');
    }
  };

  const isGlobalEmpty = allTasksRaw.length === 0;

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
          <Skel className="h-8 w-64" />
          <Skel className="h-10 w-36" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(n => <Skel key={n} className="h-28" />)}
        </div>
        <div className="grid grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(n => <Skel key={n} className="h-96" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 min-h-screen text-[var(--f-text)]" style={{ background: 'var(--f-ink-900)' }}>
      
      {/* Top Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hotel Housekeeping</h1>
          <p className="text-sm text-[var(--f-text-3)] mt-0.5">Manage daily refreshes, deep cleans, tasks, and room inspections.</p>
        </div>
        <Button variant="primary" onClick={() => setCreateModalOpen(true)} className="flex items-center gap-2 self-start md:self-auto">
          <Plus className="w-4 h-4" /> Create Task
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pending" value={totalPending} icon={Sparkles} color="var(--f-text-3)" />
        <StatCard label="In Progress" value={totalInProgress} icon={Bath} color="var(--f-info)" />
        <StatCard label="Awaiting Inspection" value={totalAwaiting} icon={ClipboardList} color="var(--f-warn)" />
        <StatCard label="Overdue Tasks" value={totalOverdue} icon={AlertTriangle} color="var(--f-bad)" />
      </div>

      {/* Filter Bar */}
      <Card className="p-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[var(--f-text-3)]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--f-text-3)]">Filters</span>
        </div>
        <div className="flex flex-wrap gap-3 flex-1 justify-end">
          <div className="w-40">
            <Select
              value={floorFilter}
              onChange={(e) => setFloorFilter(e.target.value)}
              options={[
                { value: '', label: 'All Floors' },
                { value: '1', label: '1st Floor' },
                { value: '2', label: '2nd Floor' },
                { value: '3', label: '3rd Floor' },
                { value: '4', label: '4th Floor' },
                { value: '5', label: '5th Floor' }
              ]}
            />
          </div>
          <div className="w-44">
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              options={[
                { value: '', label: 'All Task Types' },
                { value: 'CHECKOUT_CLEAN', label: 'Checkout Clean' },
                { value: 'DAILY_REFRESH', label: 'Daily Refresh' },
                { value: 'DEEP_CLEAN', label: 'Deep Clean' },
                { value: 'INSPECTION', label: 'Inspection' }
              ]}
            />
          </div>
          <div className="w-48">
            <Select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              options={[
                { value: '', label: 'All Housekeepers' },
                ...housekeepers.map(h => ({ value: h.id, label: h.user?.fullName || h.name || 'Unassigned' }))
              ]}
            />
          </div>
          {(floorFilter || typeFilter || assigneeFilter) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFloorFilter('');
                setTypeFilter('');
                setAssigneeFilter('');
              }}
              className="text-xs underline flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Reset Filters
            </Button>
          )}
        </div>
      </Card>

      {/* Kanban Board */}
      {isGlobalEmpty ? (
        <Empty
          icon={CheckCircle2}
          title="No housekeeping tasks today"
          description="Rooms are all perfectly clean! Great work to your team."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 items-start">
          {COLUMNS.map(col => {
            const colTasks = groupedTasks[col.key] || [];
            return (
              <div key={col.key} className="flex flex-col gap-3 h-full">
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 border-b-2" style={{ borderColor: col.color }}>
                  <div className="flex items-center gap-2">
                    <col.icon className="w-4 h-4" style={{ color: col.color }} />
                    <span className="text-sm font-bold">{col.label}</span>
                  </div>
                  <Tag color={col.color} bg={col.bg} className="text-xs">
                    {colTasks.length}
                  </Tag>
                </div>

                {/* Column Tasks List */}
                <div className="flex flex-col gap-3 min-h-[400px] rounded-xl bg-[var(--f-surface)]/30 p-2">
                  {colTasks.map(task => {
                    const typeMeta = TASK_TYPE_META[task.taskType] || TASK_TYPE_META.INSPECTION;
                    const priorityMeta = PRIORITY_META[task.priority] || PRIORITY_META[5];
                    const chkTotal = task.checklist?.length || 0;
                    const chkDone = task.checklist?.filter(i => i.completed).length || 0;

                    return (
                      <Card
                        key={task.id}
                        onClick={() => {
                          setSelectedTask(task);
                          setDetailModalOpen(true);
                        }}
                        className="p-4 border-[var(--f-line)]:border-[var(--f-tint-color)] flex flex-col gap-3 shadow-md"
                      >
                        {/* Title & Priority Badge */}
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-bold text-sm tracking-tight text-[var(--f-text)]">
                              Room {task.room?.roomNumber || 'N/A'}
                            </h3>
                            <span className="text-[10px] text-[var(--f-text-3)] font-medium uppercase tracking-wider block">
                              Floor {task.room?.roomNumber?.toString().substring(0, 1) || 'N/A'}
                            </span>
                          </div>
                          <Tag color={priorityMeta.color} className="text-[10px] uppercase font-bold tracking-wide">
                            {priorityMeta.label}
                          </Tag>
                        </div>

                        {/* Task Type and SLA Indicator */}
                        <div className="flex flex-wrap items-center gap-2">
                          <Tag color={typeMeta.color} className="text-[10px]">
                            {typeMeta.label}
                          </Tag>
                          <span className="text-[10px] text-[var(--f-text-3)] flex items-center gap-1">
                            <Clock className="w-3 h-3" /> SLA: {typeMeta.sla}
                          </span>
                        </div>

                        {/* Checklist progress bar */}
                        {chkTotal > 0 && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-[var(--f-text-3)]">
                              <span>Checklist Progress</span>
                              <span>{chkDone}/{chkTotal} done</span>
                            </div>
                            <div className="w-full h-1.5 bg-[var(--f-line)] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[var(--f-tint-color)] transition-all duration-300"
                                style={{ width: `${(chkDone / chkTotal) * 100}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Housekeeper Info */}
                        <div className="flex items-center gap-2 pt-2 border-t border-[var(--f-line)]/50">
                          <Avatar
                            name={task.assignedTo?.user?.fullName || task.assignedTo?.name || 'Unassigned'}
                            size="xs"
                          />
                          <div className="text-xs truncate flex-1">
                            <span className="text-[var(--f-text-3)]">By: </span>
                            <span className="font-medium text-[var(--f-text)]">
                              {task.assignedTo?.user?.fullName || task.assignedTo?.name || 'Unassigned'}
                            </span>
                          </div>
                        </div>

                        {/* Running Timer for non-completed columns */}
                        {col.key !== 'COMPLETED' && <ElapsedTimer task={task} />}
                      </Card>
                    );
                  })}

                  {colTasks.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <col.icon className="w-6 h-6 text-[var(--f-text-3)] opacity-40 mb-2" />
                      <p className="text-xs font-medium text-[var(--f-text-3)]">No tasks in {col.label}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      <Modal
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedTask(null);
          setInspectionNote('');
          setIsSelfInspect(false);
        }}
        title={`Room ${selectedTask?.room?.roomNumber || ''} Task Details`}
        className="max-w-2xl"
      >
        {selectedTask && (
          <div className="space-y-6">
            
            {/* Header info blocks */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-[10px] text-[var(--f-text-3)] uppercase font-semibold">Task Type</span>
                <p className="font-bold text-sm mt-0.5">{TASK_TYPE_META[selectedTask.taskType]?.label || selectedTask.taskType}</p>
              </div>
              <div>
                <span className="text-[10px] text-[var(--f-text-3)] uppercase font-semibold">Priority</span>
                <p className="font-bold text-sm mt-0.5" style={{ color: PRIORITY_META[selectedTask.priority]?.color }}>
                  {PRIORITY_META[selectedTask.priority]?.label || 'NORMAL'}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-[var(--f-text-3)] uppercase font-semibold">Room Status</span>
                <p className="font-bold text-sm mt-0.5 uppercase">{selectedTask.room?.status || 'N/A'}</p>
              </div>
              <div>
                <span className="text-[10px] text-[var(--f-text-3)] uppercase font-semibold">Current SLA</span>
                <p className="font-bold text-sm mt-0.5">{TASK_TYPE_META[selectedTask.taskType]?.sla || '20m'}</p>
              </div>
            </div>

            {/* Checklist */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-sm flex items-center gap-1.5">
                  <ClipboardList className="w-4 h-4 text-[var(--f-tint-color)]" /> Checklist
                </h4>
                <span className="text-xs text-[var(--f-text-3)]">
                  {selectedTask.checklist?.filter(i => i.completed).length || 0} of {selectedTask.checklist?.length || 0} items completed
                </span>
              </div>
              <div className="max-h-56 overflow-y-auto space-y-2 pr-1 border border-[var(--f-line)]/50 rounded-xl p-3 bg-[var(--f-ink-900)]">
                {selectedTask.checklist && selectedTask.checklist.length > 0 ? (
                  selectedTask.checklist.map((item, index) => (
                    <div
                      key={index}
                      onClick={() => handleToggleChecklistItem(index)}
                      className="flex items-start gap-3 p-2 rounded-lg:bg-[var(--f-line)]/20 cursor-pointer transition-colors"
                    >
                      {item.completed ? (
                        <CheckSquare className="w-4 h-4 text-[var(--f-tint-color)] mt-0.5 flex-shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-[var(--f-text-3)] mt-0.5 flex-shrink-0" />
                      )}
                      <span className={`text-xs flex-1 ${item.completed ? 'line-through text-[var(--f-text-3)]' : 'text-[var(--f-text)]'}`}>
                        {item.item || item.name || `Task checklist item #${index + 1}`}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[var(--f-text-3)] text-center py-4">No checklist items defined.</p>
                )}
              </div>
            </div>

            {/* Assignment Section */}
            <div className="space-y-3">
              <h4 className="font-bold text-sm flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-[var(--f-tint-color)]" /> Assign Housekeeper
              </h4>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select
                    value={selectedTask.assignedTo?.id || selectedTask.assignedToId || ''}
                    onChange={(e) => handleAssign(selectedTask.id, e.target.value)}
                    options={[
                      { value: '', label: 'Unassigned' },
                      ...housekeepers.map(h => ({ value: h.id, label: h.user?.fullName || h.name }))
                    ]}
                  />
                </div>
                <Button variant="outline" size="sm" onClick={handleAutoAssign}>
                  Auto-Assign
                </Button>
              </div>
            </div>

            {/* Photos section */}
            <div className="space-y-3">
              <h4 className="font-bold text-sm flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-[var(--f-tint-color)]" /> Before / After Proof
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-[var(--f-line)]/50 rounded-xl p-3 bg-[var(--f-ink-900)] text-center space-y-2">
                  <span className="text-[10px] text-[var(--f-text-3)] uppercase block">Before Photo</span>
                  {selectedTask.photoBeforeUrl ? (
                    <img src={selectedTask.photoBeforeUrl} alt="Before housekeeping" className="h-28 w-full object-cover rounded-lg" />
                  ) : (
                    <div className="h-28 bg-[var(--f-surface)] rounded-lg flex items-center justify-center border border-dashed border-[var(--f-line)]">
                      <Camera className="w-6 h-6 text-[var(--f-text-3)] opacity-40" />
                    </div>
                  )}
                </div>
                <div className="border border-[var(--f-line)]/50 rounded-xl p-3 bg-[var(--f-ink-900)] text-center space-y-2">
                  <span className="text-[10px] text-[var(--f-text-3)] uppercase block">After Photo</span>
                  {selectedTask.photoProofUrl || selectedTask.photoAfterUrl ? (
                    <img src={selectedTask.photoProofUrl || selectedTask.photoAfterUrl} alt="After housekeeping" className="h-28 w-full object-cover rounded-lg" />
                  ) : (
                    <div className="h-28 bg-[var(--f-surface)] rounded-lg flex items-center justify-center border border-dashed border-[var(--f-line)]">
                      <Camera className="w-6 h-6 text-[var(--f-text-3)] opacity-40" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Notes */}
            {selectedTask.notes && (
              <div className="p-3 bg-[var(--f-line)]/10 rounded-xl border border-[var(--f-line)]/50">
                <span className="text-[10px] text-[var(--f-text-3)] uppercase font-semibold flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" /> Notes
                </span>
                <p className="text-xs mt-1 italic text-[var(--f-text)]">{selectedTask.notes}</p>
              </div>
            )}

            {/* Status Actions */}
            <div className="pt-4 border-t border-[var(--f-line)] flex flex-col gap-4">
              <div className="flex flex-wrap gap-2 items-center justify-end">
                {/* PENDING -> START TASK */}
                {(selectedTask.status === 'PENDING') && (
                  <Button variant="primary" onClick={() => handleStartTask(selectedTask.id)}>
                    Start Task
                  </Button>
                )}

                {/* IN_PROGRESS -> COMPLETE TASK */}
                {(selectedTask.status === 'IN_PROGRESS' || selectedTask.status === 'INPROGRESS') && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full justify-between">
                    <Switch
                      checked={isSelfInspect}
                      onChange={setIsSelfInspect}
                      label="Complete & Self-Inspect"
                    />
                    <Button variant="primary" onClick={() => handleMarkComplete(selectedTask.id, isSelfInspect)}>
                      Mark Complete
                    </Button>
                  </div>
                )}

                {/* AWAITING INSPECTION Actions */}
                {(selectedTask.status === 'AWAITING_INSPECTION' || selectedTask.status === 'INSPECTED') && (
                  <div className="w-full space-y-3">
                    <Input
                      label="Inspection Notes (Required for Fail)"
                      placeholder="Add observations about room cleanliness..."
                      value={inspectionNote}
                      onChange={(e) => setInspectionNote(e.target.value)}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        onClick={() => handleInspection(selectedTask.id, false)}
                        className="bg-[var(--f-bad)] text-[var(--f-text)]:bg-bad border-none px-4 py-2"
                      >
                        Fail Inspection
                      </Button>
                      <Button
                        onClick={() => handleInspection(selectedTask.id, true)}
                        className="bg-[var(--f-ok)] text-black:bg-ok border-none px-4 py-2"
                      >
                        Pass Inspection
                      </Button>
                    </div>
                  </div>
                )}

                {/* FAILED / COMPLETED -> REASSIGN & RESTART */}
                {(selectedTask.status === 'FAILED' || selectedTask.status === 'COMPLETED' || selectedTask.status === 'DONE') && (
                  <div className="w-full flex flex-col gap-2">
                    {selectedTask.status === 'FAILED' && selectedTask.notes && (
                      <div className="p-3 bg-[var(--f-bad)]/10 text-[var(--f-bad)] rounded-xl text-xs mb-2">
                        <span className="font-bold">Failure Reason:</span> {selectedTask.notes}
                      </div>
                    )}
                    <div className="flex gap-2 justify-end items-center">
                      <span className="text-xs text-[var(--f-text-3)] font-medium">Reassign to:</span>
                      <div className="w-48">
                        <Select
                          value={selectedTask.assignedTo?.id || selectedTask.assignedToId || ''}
                          onChange={(e) => handleAssign(selectedTask.id, e.target.value)}
                          options={[
                            { value: '', label: 'Unassigned' },
                            ...housekeepers.map(h => ({ value: h.id, label: h.user?.fullName || h.name }))
                          ]}
                        />
                      </div>
                      <Button variant="primary" onClick={() => handleReassignAndRestart(selectedTask.id, selectedTask.assignedTo?.id)}>
                        Reassign & Restart
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </Modal>

      {/* Create Task Modal */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create Housekeeping Task"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <Select
              label="Select Room"
              value={createForm.roomId}
              onChange={(e) => setCreateForm({ ...createForm, roomId: e.target.value })}
              options={[
                { value: '', label: '-- Choose Room --' },
                ...rooms.map(r => ({ value: r.id, label: `Room ${r.roomNumber} (${r.status})` }))
              ]}
              required
            />
          </div>

          <div>
            <Select
              label="Task Type"
              value={createForm.taskType}
              onChange={(e) => setCreateForm({ ...createForm, taskType: e.target.value })}
              options={[
                { value: 'CHECKOUT_CLEAN', label: 'Checkout Clean (45m SLA)' },
                { value: 'DAILY_REFRESH', label: 'Daily Refresh (30m SLA)' },
                { value: 'DEEP_CLEAN', label: 'Deep Clean (90m SLA)' },
                { value: 'INSPECTION', label: 'Inspection Task (20m SLA)' }
              ]}
            />
          </div>

          <div>
            <Select
              label="Priority"
              value={createForm.priority}
              onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
              options={[
                { value: 1, label: '1 - Urgent' },
                { value: 2, label: '2 - High' },
                { value: 3, label: '3 - High' },
                { value: 4, label: '4 - High' },
                { value: 5, label: '5 - Normal' }
              ]}
            />
          </div>

          <div className="flex items-center justify-between py-2 border-y border-[var(--f-line)]/50">
            <span className="text-xs font-semibold text-[var(--f-text-3)] uppercase tracking-wider">Use Template Checklist</span>
            <Switch
              checked={createForm.useTemplateChecklist}
              onChange={(checked) => setCreateForm({ ...createForm, useTemplateChecklist: checked })}
            />
          </div>

          {!createForm.useTemplateChecklist && (
            <div>
              <label className="text-xs font-semibold text-[var(--f-text-3)] uppercase tracking-wider block mb-1">Custom Checklist Items</label>
              <textarea
                className="w-full p-3 text-sm bg-[var(--f-ink-900)] border border-[var(--f-line)] rounded-xl outline-none focus:border-[var(--f-tint-color)] text-[var(--f-text)]"
                rows={3}
                placeholder="Item 1&#10;Item 2&#10;Item 3"
                value={createForm.customChecklist}
                onChange={(e) => setCreateForm({ ...createForm, customChecklist: e.target.value })}
              />
              <p className="text-[10px] text-[var(--f-text-3)] mt-1">Write each checklist item on a new line.</p>
            </div>
          )}

          <div>
            <Input
              label="Special Notes"
              placeholder="e.g. guest requested extra pillows, check AC unit..."
              value={createForm.notes}
              onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="ghost" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create Task
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
