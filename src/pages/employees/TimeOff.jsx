import { useState, useEffect } from 'react';
import { timeOffApi, feedbackApi, employeeApi } from '@/lib/marketplaceApi';
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
  StatCard,
  Textarea,
  Tooltip,
  Switch
} from '@/components/forge';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Plus,
  Star,
  MessageSquare,
  ThumbsUp,
  AlertCircle,
  Clock,
  Users,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

const TIME_OFF_TYPES = [
  { value: 'VACATION', label: 'Vacation' },
  { value: 'SICK', label: 'Sick Leave' },
  { value: 'PERSONAL', label: 'Personal Leave' },
  { value: 'EMERGENCY', label: 'Emergency Leave' },
  { value: 'UNPAID', label: 'Unpaid Leave' },
];

const FEEDBACK_TAGS = [
  { value: 'TEAMWORK', label: 'Teamwork' },
  { value: 'PUNCTUALITY', label: 'Punctuality' },
  { value: 'QUALITY', label: 'Quality' },
  { value: 'COMMUNICATION', label: 'Communication' },
  { value: 'LEADERSHIP', label: 'Leadership' },
  { value: 'ATTITUDE', label: 'Attitude' },
];

// Helper to format Date: 'MMM D, YYYY' (e.g. Jul 16, 2026)
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  });
}

const TYPE_COLORS = {
  VACATION: { text: '#a855f7', bg: 'rgba(168, 85, 247, 0.1)' }, // purple/blue
  SICK: { text: 'var(--f-bad)', bg: 'rgba(239, 68, 68, 0.1)' },
  PERSONAL: { text: 'var(--f-warn)', bg: 'rgba(245, 158, 11, 0.1)' },
  EMERGENCY: { text: 'var(--f-bad)', bg: 'rgba(239, 68, 68, 0.1)' },
  UNPAID: { text: 'var(--f-text-3)', bg: 'rgba(156, 163, 175, 0.1)' },
};

const STATUS_COLORS = {
  PENDING: { text: 'var(--f-warn)', bg: 'rgba(245, 158, 11, 0.1)' },
  APPROVED: { text: 'var(--f-ok)', bg: 'rgba(16, 185, 129, 0.1)' },
  REJECTED: { text: 'var(--f-bad)', bg: 'rgba(239, 68, 68, 0.1)' },
  CANCELLED: { text: 'var(--f-text-3)', bg: 'rgba(156, 163, 175, 0.1)' },
};

export default function TimeOff() {
    const { hasPermission } = usePermission();

  const canApproveTimeOff = hasPermission('shifts.approve_timeoff');
  const canGiveFeedback = hasPermission('feedback.give');
  const canViewFeedback = hasPermission('feedback.view');

  const [activeTab, setActiveTab] = useState('timeoff');

  // Loading states
  const [loadingTimeOff, setLoadingTimeOff] = useState(true);
  const [loadingFeedback, setLoadingFeedback] = useState(true);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  // Core Data
  const [employees, setEmployees] = useState([]);
  const [timeOffRequests, setTimeOffRequests] = useState([]);
  const [feedbackList, setFeedbackList] = useState([]);

  // Filters
  const [timeOffStatusFilter, setTimeOffStatusFilter] = useState('all');
  const [timeOffTypeFilter, setTimeOffTypeFilter] = useState('all');
  const [feedbackEmployeeFilter, setFeedbackEmployeeFilter] = useState('all');

  // Accordion for Past/History requests
  const [pastRequestsOpen, setPastRequestsOpen] = useState(false);

  // Modals
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedRequestForReject, setSelectedRequestForReject] = useState(null);
  const [rejectNote, setRejectNote] = useState('');

  const [newRequestModalOpen, setNewRequestModalOpen] = useState(false);
  const [newRequestForm, setNewRequestForm] = useState({
    employeeId: '',
    type: 'VACATION',
    startDate: '',
    endDate: '',
    reason: '',
    isEmergency: false,
  });

  const [giveFeedbackModalOpen, setGiveFeedbackModalOpen] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    receiverEmployeeId: '',
    rating: 5,
    tags: [],
    comment: '',
    periodStart: '',
    periodEnd: '',
  });

  // Fetch Employees
  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const res = await employeeApi.list();
      setEmployees(res.data?.employees || []);
    } catch (err) {
      toast.error('Failed to load employees list');
    } finally {
      setLoadingEmployees(false);
    }
  };

  // Fetch Time-Off
  const fetchTimeOff = async () => {
    try {
      setLoadingTimeOff(true);
      const res = await timeOffApi.list();
      setTimeOffRequests(res.data?.requests || []);
    } catch (err) {
      toast.error('Failed to load time-off requests');
    } finally {
      setLoadingTimeOff(false);
    }
  };

  // Fetch Feedback
  const fetchFeedback = async () => {
    try {
      setLoadingFeedback(true);
      const res = await feedbackApi.list();
      setFeedbackList(res.data?.feedback || []);
    } catch (err) {
      toast.error('Failed to load feedback history');
    } finally {
      setLoadingFeedback(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchTimeOff();
    fetchFeedback();
  }, []);

  // Time-Off Workflows
  const handleApprove = async (id) => {
    try {
      await timeOffApi.approve(id);
      toast.success('Time-off request approved');
      fetchTimeOff();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve request');
    }
  };

  const handleOpenRejectModal = (req) => {
    setSelectedRequestForReject(req);
    setRejectNote('');
    setRejectModalOpen(true);
  };

  const handleRejectSubmit = async () => {
    if (!selectedRequestForReject) return;
    try {
      await timeOffApi.reject(selectedRequestForReject.id, rejectNote);
      toast.success('Time-off request rejected');
      setRejectModalOpen(false);
      setSelectedRequestForReject(null);
      setRejectNote('');
      fetchTimeOff();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject request');
    }
  };

  const handleCreateRequest = async () => {
    if (!newRequestForm.employeeId) {
      toast.error('Please select an employee');
      return;
    }
    if (!newRequestForm.startDate || !newRequestForm.endDate) {
      toast.error('Please select start and end dates');
      return;
    }
    try {
      await timeOffApi.create(newRequestForm);
      toast.success('Time-off request created');
      setNewRequestModalOpen(false);
      setNewRequestForm({
        employeeId: '',
        type: 'VACATION',
        startDate: '',
        endDate: '',
        reason: '',
        isEmergency: false,
      });
      fetchTimeOff();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create request');
    }
  };

  // Feedback Workflows
  const handleGiveFeedback = async () => {
    if (!feedbackForm.receiverEmployeeId) {
      toast.error('Please select an employee');
      return;
    }
    if (!feedbackForm.comment) {
      toast.error('Please provide a comment');
      return;
    }
    try {
      await feedbackApi.give(feedbackForm);
      toast.success('Feedback submitted successfully');
      setGiveFeedbackModalOpen(false);
      setFeedbackForm({
        receiverEmployeeId: '',
        rating: 5,
        tags: [],
        comment: '',
        periodStart: '',
        periodEnd: '',
      });
      fetchFeedback();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit feedback');
    }
  };

  const toggleTag = (tagVal) => {
    setFeedbackForm((prev) => {
      const isSelected = prev.tags.includes(tagVal);
      const newTags = isSelected
        ? prev.tags.filter((t) => t !== tagVal)
        : [...prev.tags, tagVal];
      return { ...prev, tags: newTags };
    });
  };

  // Computed Stats for Time Off
  const pendingRequests = timeOffRequests.filter((r) => r.status === 'PENDING');
  const pastRequests = timeOffRequests.filter((r) => r.status !== 'PENDING');

  const pendingCount = pendingRequests.length;

  const approvedThisMonthCount = timeOffRequests.filter((r) => {
    if (r.status !== 'APPROVED') return false;
    const start = new Date(r.startDate);
    const now = new Date();
    return start.getMonth() === now.getMonth() && start.getFullYear() === now.getFullYear();
  }).length;

  const rejectedThisMonthCount = timeOffRequests.filter((r) => {
    if (r.status !== 'REJECTED') return false;
    const start = new Date(r.startDate);
    const now = new Date();
    return start.getMonth() === now.getMonth() && start.getFullYear() === now.getFullYear();
  }).length;

  const emergencyPendingCount = pendingRequests.filter((r) => r.isEmergency).length;

  // Filtered Time-off Requests (excluding PENDING from the filter logic if we want to show pending and past separately, or filtering both)
  const filterRequest = (req) => {
    const matchesStatus = timeOffStatusFilter === 'all' || req.status === timeOffStatusFilter;
    const matchesType = timeOffTypeFilter === 'all' || req.type === timeOffTypeFilter;
    return matchesStatus && matchesType;
  };

  const filteredPendingRequests = pendingRequests.filter(filterRequest);
  const filteredPastRequests = pastRequests.filter(filterRequest);

  // Feedback analysis per employee
  const feedbackByEmployeeMap = {};
  feedbackList.forEach((fb) => {
    const rxId = fb.receiverEmployeeId;
    if (!feedbackByEmployeeMap[rxId]) {
      feedbackByEmployeeMap[rxId] = [];
    }
    feedbackByEmployeeMap[rxId].push(fb);
  });

  const getAvgRatingForEmployee = (empId) => {
    const fbs = feedbackByEmployeeMap[empId] || [];
    if (fbs.length === 0) return 'N/A';
    const sum = fbs.reduce((acc, curr) => acc + (curr.rating || 0), 0);
    return (sum / fbs.length).toFixed(1);
  };

  const filteredFeedbackList = feedbackList.filter((fb) => {
    if (feedbackEmployeeFilter === 'all') return true;
    return fb.receiverEmployeeId === feedbackEmployeeFilter;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--f-text)]">Time Off & Feedback</h1>
          <p className="text-sm text-[var(--f-text-3)] mt-0.5">
            Manage leaves, track team absences, and cultivate professional growth.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'timeoff' && canApproveTimeOff && (
            <Button onClick={() => setNewRequestModalOpen(true)}>
              <Plus className="w-4 h-4" /> New Request
            </Button>
          )}
          {activeTab === 'feedback' && canGiveFeedback && (
            <Button onClick={() => setGiveFeedbackModalOpen(true)}>
              <Plus className="w-4 h-4" /> Give Feedback
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-line">
        <button
          onClick={() => setActiveTab('timeoff')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'timeoff'
              ? 'border-[var(--f-tint-color)] text-[var(--f-text)]'
              : 'border-transparent text-[var(--f-text-3)] hover:text-[var(--f-text)]'
          }`}
        >
          Time-Off Requests
        </button>
        <button
          onClick={() => setActiveTab('feedback')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'feedback'
              ? 'border-[var(--f-tint-color)] text-[var(--f-text)]'
              : 'border-transparent text-[var(--f-text-3)] hover:text-[var(--f-text)]'
          }`}
        >
          Employee Feedback
        </button>
      </div>

      {/* Tab 1: Time Off */}
      {activeTab === 'timeoff' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              label="Pending Requests"
              value={pendingCount}
              icon={Clock}
              color="var(--f-warn)"
              loading={loadingTimeOff}
            />
            <StatCard
              label="Approved This Month"
              value={approvedThisMonthCount}
              icon={CheckCircle2}
              color="var(--f-ok)"
              loading={loadingTimeOff}
            />
            <StatCard
              label="Rejected This Month"
              value={rejectedThisMonthCount}
              icon={XCircle}
              color="var(--f-bad)"
              loading={loadingTimeOff}
            />
            <StatCard
              label="Emergency Pending"
              value={emergencyPendingCount}
              icon={AlertCircle}
              color="var(--f-bad)"
              loading={loadingTimeOff}
            />
          </div>

          {/* Filter Bar */}
          <Card className="flex flex-col sm:flex-row gap-4 items-center justify-between py-3">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="w-full sm:w-44">
                <Select
                  label="Status"
                  value={timeOffStatusFilter}
                  onChange={(e) => setTimeOffStatusFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Statuses' },
                    { value: 'PENDING', label: 'Pending' },
                    { value: 'APPROVED', label: 'Approved' },
                    { value: 'REJECTED', label: 'Rejected' },
                    { value: 'CANCELLED', label: 'Cancelled' },
                  ]}
                />
              </div>
              <div className="w-full sm:w-44">
                <Select
                  label="Type"
                  value={timeOffTypeFilter}
                  onChange={(e) => setTimeOffTypeFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Types' },
                    ...TIME_OFF_TYPES,
                  ]}
                />
              </div>
            </div>
            <div className="text-xs text-[var(--f-text-3)]">
              Showing {filteredPendingRequests.length + filteredPastRequests.length} requests
            </div>
          </Card>

          {/* Pending Section */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--f-text-3)] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--f-warn)]" />
              Pending Requests ({filteredPendingRequests.length})
            </h2>

            {loadingTimeOff ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Skeleton className="h-40" />
                <Skeleton className="h-40" />
              </div>
            ) : filteredPendingRequests.length === 0 ? (
              <Empty
                icon={Calendar}
                title="No Pending Requests"
                description="Everything is clear! No pending time-off requests need your attention."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPendingRequests.map((req) => {
                  const typeClr = TYPE_COLORS[req.type] || { text: 'var(--f-tint-color)', bg: 'rgba(168, 85, 247, 0.1)' };
                  return (
                    <Card key={req.id} className="relative flex flex-col justify-between">
                      <div>
                        {/* Card Header with Employee profile */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <Avatar
                              src={req.employee?.user?.avatarUrl}
                              fallback={req.employee?.user?.fullName?.charAt(0) || 'E'}
                              size="md"
                            />
                            <div>
                              <h3 className="text-sm font-semibold text-[var(--f-text)]">
                                {req.employee?.user?.fullName || 'Unknown Employee'}
                              </h3>
                              <p className="text-xs text-[var(--f-text-3)]">
                                {req.employee?.title || req.employee?.role || 'Staff'}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1.5">
                            <Badge color={typeClr.text} bg={typeClr.bg}>
                              {req.type}
                            </Badge>
                            {req.isEmergency && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold text-[var(--f-bad)] bg-red-500/10 border border-red-500/20 animate-pulse">
                                <AlertCircle className="w-3.5 h-3.5" /> Emergency
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Request content */}
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-1.5 text-xs text-[var(--f-text-3)]">
                            <Calendar className="w-3.5 h-3.5" />
                            <span className="font-semibold text-[var(--f-text)]">
                              {formatDate(req.startDate)}
                            </span>
                            <span>to</span>
                            <span className="font-semibold text-[var(--f-text)]">
                              {formatDate(req.endDate)}
                            </span>
                          </div>
                          {req.reason && (
                            <p className="text-sm text-[var(--f-text)] italic bg-[var(--f-ink-900)] p-3 rounded-xl border border-line">
                              "{req.reason}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action buttons (Visible only if has shifts.approve_timeoff permission) */}
                      {canApproveTimeOff && (
                        <div className="flex items-center gap-2 border-t border-line pt-4 mt-2">
                          <Button
                            variant="primary"
                            size="sm"
                            className="flex-1 bg-[var(--f-ok)] text-white hover:bg-emerald-600 border border-transparent"
                            onClick={() => handleApprove(req.id)}
                          >
                            <CheckCircle2 className="w-4 h-4" /> Approve
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="flex-1 hover:border-[var(--f-bad)] hover:text-[var(--f-bad)]"
                            onClick={() => handleOpenRejectModal(req)}
                          >
                            <XCircle className="w-4 h-4 text-[var(--f-bad)]" /> Reject
                          </Button>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Past Requests Section (Accordion style) */}
          <div className="border border-line rounded-2xl overflow-hidden bg-surface">
            <button
              onClick={() => setPastRequestsOpen(!pastRequestsOpen)}
              className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-[var(--f-text)] hover:bg-[var(--f-line)]/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[var(--f-tint-color)]" />
                <span>Past & Resolved Requests ({filteredPastRequests.length})</span>
              </div>
              {pastRequestsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>

            {pastRequestsOpen && (
              <div className="border-t border-line p-5 space-y-3 bg-[var(--f-ink-900)]">
                {loadingTimeOff ? (
                  <Skeleton className="h-24" />
                ) : filteredPastRequests.length === 0 ? (
                  <div className="text-center py-6 text-sm text-[var(--f-text-3)]">
                    No past requests found matching active filters.
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--f-line)]">
                    {filteredPastRequests.map((req) => {
                      const statusClr = STATUS_COLORS[req.status] || { text: 'var(--f-text-3)', bg: 'rgba(156, 163, 175, 0.1)' };
                      const typeClr = TYPE_COLORS[req.type] || { text: 'var(--f-tint-color)', bg: 'rgba(168, 85, 247, 0.1)' };
                      return (
                        <div key={req.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <Avatar
                              src={req.employee?.user?.avatarUrl}
                              fallback={req.employee?.user?.fullName?.charAt(0) || 'E'}
                              size="sm"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-[var(--f-text)]">
                                  {req.employee?.user?.fullName || 'Unknown Employee'}
                                </span>
                                <Badge color={typeClr.text} bg={typeClr.bg}>
                                  {req.type}
                                </Badge>
                              </div>
                              <p className="text-xs text-[var(--f-text-3)] mt-0.5">
                                {formatDate(req.startDate)} - {formatDate(req.endDate)}
                              </p>
                              {req.managerNote && (
                                <p className="text-xs text-[var(--f-text-3)] mt-1.5 italic bg-[var(--f-surface)] p-2 rounded-lg border border-line max-w-lg">
                                  <span className="font-semibold text-[var(--f-text)] not-italic block mb-0.5">Manager Note:</span>
                                  "{req.managerNote}"
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-center">
                            {req.isEmergency && (
                              <Badge color="var(--f-bad)" bg="rgba(239, 68, 68, 0.1)">Emergency</Badge>
                            )}
                            <Badge color={statusClr.text} bg={statusClr.bg}>
                              {req.status}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Feedback */}
      {activeTab === 'feedback' && (
        <div className="space-y-6">
          {/* Top Bar Filters & Rating Display */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Filter by Employee Card */}
            <Card className="lg:col-span-2 flex items-center justify-between p-5">
              <div className="w-full sm:w-72">
                <Select
                  label="Filter by Employee"
                  value={feedbackEmployeeFilter}
                  onChange={(e) => setFeedbackEmployeeFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Employees' },
                    ...employees.map((emp) => ({
                      value: emp.id,
                      label: emp.user?.fullName || 'Unknown Employee',
                    })),
                  ]}
                />
              </div>
              <div className="hidden sm:block text-xs text-[var(--f-text-3)]">
                Loaded {filteredFeedbackList.length} feedback records
              </div>
            </Card>

            {/* Average Rating Display */}
            <Card className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-[var(--f-tint-color)]">
                <Star className="w-6 h-6 fill-current" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[var(--f-text-3)] uppercase tracking-wider">
                  Employee Rating
                </p>
                <p className="text-xl font-bold text-[var(--f-text)]">
                  {feedbackEmployeeFilter === 'all'
                    ? 'Select an employee to see average'
                    : `${getAvgRatingForEmployee(feedbackEmployeeFilter)} / 5.0`}
                </p>
              </div>
            </Card>
          </div>

          {/* Feedback History List */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--f-text-3)] flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[var(--f-tint-color)]" />
              Feedback History
            </h2>

            {loadingFeedback ? (
              <div className="space-y-4">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
              </div>
            ) : filteredFeedbackList.length === 0 ? (
              <Empty
                icon={ThumbsUp}
                title="No Feedback Yet"
                description="Give construct feedback or perform quarterly reviews to kick off professional development!"
              />
            ) : (
              <div className="space-y-4">
                {filteredFeedbackList.map((fb) => (
                  <Card key={fb.id} className="space-y-4">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Giver and Receiver details */}
                      <div className="flex items-center flex-wrap gap-3">
                        <div className="flex items-center gap-2">
                          <Avatar
                            src={fb.giver?.user?.avatarUrl}
                            fallback={fb.giver?.user?.fullName?.charAt(0) || 'G'}
                            size="sm"
                          />
                          <span className="text-sm font-semibold text-[var(--f-text)]">
                            {fb.giver?.user?.fullName || 'Manager'}
                          </span>
                        </div>
                        <span className="text-xs text-[var(--f-text-3)] font-bold">➔</span>
                        <div className="flex items-center gap-2">
                          <Avatar
                            src={fb.receiver?.user?.avatarUrl}
                            fallback={fb.receiver?.user?.fullName?.charAt(0) || 'R'}
                            size="sm"
                          />
                          <span className="text-sm font-semibold text-[var(--f-text)]">
                            {fb.receiver?.user?.fullName || 'Employee'}
                          </span>
                        </div>
                      </div>

                      {/* Rating & Period */}
                      <div className="flex items-center gap-4 self-end sm:self-center">
                        {fb.periodStart && fb.periodEnd && (
                          <span className="text-xs text-[var(--f-text-3)]">
                            Period: {formatDate(fb.periodStart)} - {formatDate(fb.periodEnd)}
                          </span>
                        )}
                        <div className="flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/25 px-2.5 py-1 rounded-xl text-yellow-500 text-xs font-bold">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span>{fb.rating} / 5</span>
                        </div>
                      </div>
                    </div>

                    {/* Comment */}
                    <p className="text-sm text-[var(--f-text)] bg-[var(--f-ink-900)] p-3 rounded-xl border border-line leading-relaxed">
                      "{fb.comment}"
                    </p>

                    {/* Multi-select Tags / Chips */}
                    {fb.tags && fb.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-line">
                        {fb.tags.map((tag) => (
                          <Badge key={tag} color="var(--f-tint-color)">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reject Modal with Manager Note */}
      <Modal
        open={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject Time-Off Request"
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--f-text-3)]">
            Please provide a note or reason for rejecting this time-off request. This will be shared with the employee.
          </p>
          <Textarea
            label="Manager Note"
            placeholder="e.g., Short-staffed during this period or please reschedule."
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" className="bg-[var(--f-bad)] text-white hover:bg-red-600" onClick={handleRejectSubmit}>
              Confirm Reject
            </Button>
          </div>
        </div>
      </Modal>

      {/* New Time-Off Request Modal (For Managers creating on behalf of employees) */}
      <Modal
        open={newRequestModalOpen}
        onClose={() => setNewRequestModalOpen(false)}
        title="New Time-Off Request"
      >
        <div className="space-y-4">
          <Select
            label="Select Employee"
            value={newRequestForm.employeeId}
            onChange={(e) => setNewRequestForm({ ...newRequestForm, employeeId: e.target.value })}
            options={[
              { value: '', label: 'Choose an employee...' },
              ...employees.map((emp) => ({
                value: emp.id,
                label: emp.user?.fullName || 'Unknown Employee',
              })),
            ]}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Type"
              value={newRequestForm.type}
              onChange={(e) => setNewRequestForm({ ...newRequestForm, type: e.target.value })}
              options={TIME_OFF_TYPES}
            />
            <div className="flex items-center justify-between border border-line rounded-xl px-4 bg-[var(--f-ink-900)] h-[50px] mt-[22px]">
              <span className="text-xs font-semibold text-[var(--f-text-3)] uppercase tracking-wider">
                Emergency?
              </span>
              <Switch
                checked={newRequestForm.isEmergency}
                onChange={(checked) => setNewRequestForm({ ...newRequestForm, isEmergency: checked })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={newRequestForm.startDate}
              onChange={(e) => setNewRequestForm({ ...newRequestForm, startDate: e.target.value })}
            />
            <Input
              label="End Date"
              type="date"
              value={newRequestForm.endDate}
              onChange={(e) => setNewRequestForm({ ...newRequestForm, endDate: e.target.value })}
            />
          </div>

          <Textarea
            label="Reason"
            placeholder="Details or comments regarding this absence..."
            value={newRequestForm.reason}
            onChange={(e) => setNewRequestForm({ ...newRequestForm, reason: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-line">
            <Button variant="secondary" onClick={() => setNewRequestModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateRequest}>
              Create Request
            </Button>
          </div>
        </div>
      </Modal>

      {/* Give Feedback Modal */}
      <Modal
        open={giveFeedbackModalOpen}
        onClose={() => setGiveFeedbackModalOpen(false)}
        title="Give Employee Feedback"
      >
        <div className="space-y-4">
          <Select
            label="Select Employee"
            value={feedbackForm.receiverEmployeeId}
            onChange={(e) => setFeedbackForm({ ...feedbackForm, receiverEmployeeId: e.target.value })}
            options={[
              { value: '', label: 'Choose an employee...' },
              ...employees.map((emp) => ({
                value: emp.id,
                label: emp.user?.fullName || 'Unknown Employee',
              })),
            ]}
          />

          {/* Rating Choice (1-5 Star Selection) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--f-text-3)] uppercase tracking-wider">
              Rating
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFeedbackForm({ ...feedbackForm, rating: star })}
                  className="p-1 text-yellow-500 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`w-7 h-7 ${
                      star <= feedbackForm.rating ? 'fill-current' : 'text-zinc-600'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Multi-select Tags Chips */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--f-text-3)] uppercase tracking-wider">
              Review Tags (Multi-select)
            </label>
            <div className="flex flex-wrap gap-2">
              {FEEDBACK_TAGS.map((tag) => {
                const isSelected = feedbackForm.tags.includes(tag.value);
                return (
                  <button
                    key={tag.value}
                    type="button"
                    onClick={() => toggleTag(tag.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      isSelected
                        ? 'bg-[var(--f-tint-color)] text-[var(--f-ink-900)] border-[var(--f-tint-color)]'
                        : 'bg-[var(--f-ink-900)] text-[var(--f-text-3)] border-line hover:border-[var(--f-tint-color)]'
                    }`}
                  >
                    {tag.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Period Start"
              type="date"
              value={feedbackForm.periodStart}
              onChange={(e) => setFeedbackForm({ ...feedbackForm, periodStart: e.target.value })}
            />
            <Input
              label="Period End"
              type="date"
              value={feedbackForm.periodEnd}
              onChange={(e) => setFeedbackForm({ ...feedbackForm, periodEnd: e.target.value })}
            />
          </div>

          <Textarea
            label="Feedback Comment"
            placeholder="Provide constructed advice, call out achievements, or note areas of improvement..."
            value={feedbackForm.comment}
            onChange={(e) => setFeedbackForm({ ...feedbackForm, comment: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-line">
            <Button variant="secondary" onClick={() => setGiveFeedbackModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleGiveFeedback}>
              Submit Feedback
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
