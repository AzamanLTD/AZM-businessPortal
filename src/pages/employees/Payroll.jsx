import React, { useState, useEffect } from 'react';
import { usePermission } from '@/hooks/usePermission';
import { payrollApi, ewaApi, employeeApi } from '@/lib/marketplaceApi';
import {
  Card,
  Button,
  Tag,
  Input,
  Select,
  Dialog,
  Empty,
  Skel,
  Avatar,
  StatCard,
  Tooltip,
  Progress
} from '@/components/instrument';
import {
  DollarSign,
  Wallet,
  TrendingUp,
  Download,
  Clock,
  CheckCircle2,
  AlertCircle,
  Zap,
  ArrowUpCircle,
  Calendar
} from 'lucide-react';
import { toast } from '@/lib/toast';
import {
  normalizeAmountInput,
  exceedsCapHint,
  resolveWithdrawIntentKey,
  withdrawIntentFingerprint,
  describeWithdrawResult,
  isUnknownOutcome,
  loadUnresolvedWithdrawIntent,
  clearUnresolvedWithdrawIntent,
  ensureDurableWithdrawIntent,
  isDefinitiveEwaRefusal,
  isAuthoritativeWithdrawSuccess,
} from '@/lib/ewaWithdraw';

export default function Payroll() {
  const { hasPermission } = usePermission();
  
  const canView = hasPermission('payroll.view');
  const canProcess = hasPermission('payroll.process');
  const canDisburse = hasPermission('payroll.disburse');

  // Page level states
  const [activeTab, setActiveTab] = useState('payroll'); // 'payroll' or 'ewa'
  const [loadingPayroll, setLoadingPayroll] = useState(false);
  const [loadingEwa, setLoadingEwa] = useState(false);

  // Filter & selections
  const [currentPeriod, setCurrentPeriod] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });

  // Payroll tab data
  const [payrollSummary, setPayrollSummary] = useState(null);
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [processingPayroll, setProcessingPayroll] = useState(false);
  const [disbursingAll, setDisbursingAll] = useState(false);
  const [disbursingId, setDisbursingId] = useState(null);

  // EWA tab data
  const [ewaSummary, setEwaSummary] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loadingEmployeeEwa, setLoadingEmployeeEwa] = useState(false);
  const [employeeEwaEligibility, setEmployeeEwaEligibility] = useState(null);
  const [employeeEwaHistory, setEmployeeEwaHistory] = useState([]);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [processingWithdrawal, setProcessingWithdrawal] = useState(false);
  // One idempotency identity per withdrawal INTENT (backend contract:
  // POST /api/business-os/ewa/withdraw dedupes on idempotencyKey and
  // replays the committed withdrawal for a safe retry). Kept across
  // attempts until the intent is settled, abandoned, or economically
  // changed — so a retry after a timeout can never mint a second payout.
  const [withdrawIntent, setWithdrawIntent] = useState(null);

  // Modal control states
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isEwaModalOpen, setIsEwaModalOpen] = useState(false);

  // Standard period list (past months, current, and near future)
  const periods = [
    { value: '2026-09', label: 'September 2026' },
    { value: '2026-08', label: 'August 2026' },
    { value: '2026-07', label: 'July 2026 (Current)' },
    { value: '2026-06', label: 'June 2026' },
    { value: '2026-05', label: 'May 2026' },
    { value: '2026-04', label: 'April 2026' },
  ];

  // Fetch Payroll Tab data
  const fetchPayrollData = async () => {
    if (!canView) return;
    setLoadingPayroll(true);
    try {
      const [sumRes, recsRes] = await Promise.all([
        payrollApi.summary(currentPeriod),
        payrollApi.list({ period: currentPeriod })
      ]);
      setPayrollSummary(sumRes?.data || null);
      setPayrollRecords(recsRes?.data?.records || []);
    } catch (err) {
      console.error(err);
      toast.stop('Failed to load payroll details');
    } finally {
      setLoadingPayroll(false);
    }
  };

  // Fetch EWA Tab data
  const fetchEwaData = async () => {
    if (!canView) return;
    setLoadingEwa(true);
    try {
      const [sumRes, empRes] = await Promise.all([
        ewaApi.summary(),
        employeeApi.list()
      ]);
      setEwaSummary(sumRes?.data || null);
      // Backend may return nested array, handles safely
      const rawEmployees = empRes?.data?.employees || empRes?.employees || empRes?.data || [];
      
      // Let's augment each employee with eligibility overview for the status badge / wages
      const augmentedEmployees = await Promise.all(
        rawEmployees.map(async (emp) => {
          try {
            const eligibilityRes = await ewaApi.eligibility(emp.id);
            return {
              ...emp,
              ewa: eligibilityRes?.data || null
            };
          } catch {
            return { ...emp, ewa: null };
          }
        })
      );
      setEmployees(augmentedEmployees);
    } catch (err) {
      console.error(err);
      toast.stop('Failed to load EWA dashboard');
    } finally {
      setLoadingEwa(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'payroll') {
      fetchPayrollData();
    } else {
      fetchEwaData();
    }
  }, [activeTab, currentPeriod, canView]);

  // Process Payroll Action
  const handleProcessPayroll = async () => {
    if (!canProcess) {
      toast.stop('You do not have permission to process payroll');
      return;
    }
    setProcessingPayroll(true);
    try {
      await payrollApi.process({ period: currentPeriod });
      toast.go(`Successfully processed payroll for period ${currentPeriod}`);
      fetchPayrollData();
    } catch (err) {
      console.error(err);
      toast.stop('Failed to process payroll');
    } finally {
      setProcessingPayroll(false);
    }
  };

  // Disburse Single Payroll
  const handleDisburseSingle = async (payrollId) => {
    if (!canDisburse) {
      toast.stop('You do not have permission to disburse payments');
      return;
    }
    setDisbursingId(payrollId);
    try {
      await payrollApi.disburse({ payrollId });
      // Success is only claimed on the server's 2xx: the backend settles the
      // payroll and its transaction result is the authoritative answer.
      toast.go('Payroll disbursed per the server');
      fetchPayrollData();
    } catch (err) {
      if (isUnknownOutcome(err)) {
        // No HTTP answer — the outcome is unknown, and calling it a failure
        // invites a blind retry. The backend's atomic claim ("already
        // disbursed or not pending") makes a retry safe, but the operator
        // should still verify status first.
        toast.stop('Connection lost — this payroll may have been disbursed', {
          description: 'Check the payroll status before retrying. The server refuses to settle an already-disbursed payroll twice.',
        });
      } else {
        // Definitive server refusal — surface the server's own message
        // (already disbursed, external-preference unsupported, snapshot
        // stale, 403 …) instead of a blanket "Disbursement failed".
        toast.stop(err.message || 'Disbursement refused by the server');
      }
    } finally {
      setDisbursingId(null);
    }
  };

  // Disburse All Ready Payrolls
  const handleDisburseAll = async () => {
    if (!canDisburse) {
      toast.stop('You do not have permission to disburse payments');
      return;
    }
    const readyRecords = payrollRecords.filter(r => r.status === 'READY');
    if (readyRecords.length === 0) {
      // toast.warning never existed on the toast API — this path was a
      // latent TypeError. Honest stop-tone message instead.
      toast.stop('No payroll records are ready for disbursement');
      return;
    }

    setDisbursingAll(true);
    try {
      // Promise.all ABORTED at the first rejection and the blanket catch
      // lied twice: committed disbursements were reported as failures, and
      // the server's typed refusals were erased. allSettled reports the
      // exact settled/refused/unknown split from the server's answers.
      const settled = await Promise.allSettled(
        readyRecords.map(r => payrollApi.disburse({ payrollId: r.id }))
      );
      const ok = settled.filter(x => x.status === 'fulfilled').length;
      const rejected = settled.filter(x => x.status === 'rejected');
      const definitive = rejected.filter(x => !isUnknownOutcome(x.reason));
      const unknown = rejected.length - definitive.length;

      if (rejected.length === 0) {
        toast.go(`All ${ok} ready payroll payments disbursed per the server`);
      } else if (unknown === 0) {
        const first = definitive[0]?.reason?.message || 'refused by the server';
        toast.stop(`${ok} of ${readyRecords.length} payroll payments disbursed — ${definitive.length} refused`, {
          description: `Server: ${first}`,
        });
      } else {
        toast.stop(`${ok} of ${readyRecords.length} payroll payments confirmed — ${unknown} with unknown outcome`, {
          description: 'Some requests got no server answer and may have gone through. Check payroll statuses before retrying; the server refuses to settle an already-disbursed payroll twice.',
        });
      }
      fetchPayrollData();
    } catch (err) {
      // allSettled never rejects — defensive only.
      toast.stop(err.message || 'Failed to disburse payroll payments');
    } finally {
      setDisbursingAll(false);
    }
  };

  // Open EWA Detail for specific Employee
  const handleSelectEmployeeEwa = async (emp) => {
    setSelectedEmployee(emp);
    setLoadingEmployeeEwa(true);
    // Recover any unresolved withdrawal identity for THIS employee first: a
    // request that got no server answer may have committed, and its key is
    // the only thing that makes a later retry safe. The recovery is made
    // explicit (banner + prefilled retry below) — never silent.
    const stored = loadUnresolvedWithdrawIntent(emp.id);
    setWithdrawIntent(stored
      ? { key: stored.key, fingerprint: stored.fingerprint, amount: stored.amount, unresolved: true }
      : null);
    setWithdrawAmount(stored ? stored.amount : '');
    setIsEwaModalOpen(true);
    try {
      const [eligRes, histRes] = await Promise.all([
        ewaApi.eligibility(emp.id),
        ewaApi.history(emp.id)
      ]);
      setEmployeeEwaEligibility(eligRes?.data || null);
      setEmployeeEwaHistory(histRes?.data?.withdrawals || histRes?.withdrawals || []);
    } catch (err) {
      console.error(err);
      toast.stop('Failed to load EWA employee info');
    } finally {
      setLoadingEmployeeEwa(false);
    }
  };

  // Submit EWA withdrawal request.
  // Financial-action integrity (backend /api/business-os/ewa/withdraw):
  //  - the amount travels as the operator's EXACT decimal string, never a
  //    JS float, so no monetary value is rounded or normalized on the wire;
  //  - the request carries an intent-scoped idempotencyKey: a retry of the
  //    same intent reuses it (the backend replays the committed withdrawal
  //    and moves no money), while any economic change mints a new key;
  //  - success is reported from the SERVER's computed truth (gross, fee,
  //    net, replayed) — never from the typed amount or optimistic state;
  //  - a definitive server refusal surfaces the server's own message; an
  //    UNKNOWN outcome (no HTTP answer) is never called a failure, and the
  //    intent key is kept so the retry cannot double-pay.
  const handleWithdrawEwaSubmit = async (e) => {
    e?.preventDefault?.();
    if (!canProcess) {
      toast.stop('You do not have permission to process withdrawals');
      return;
    }
    const amount = normalizeAmountInput(withdrawAmount);
    if (!amount || Number(amount) <= 0) {
      toast.stop('Enter an exact amount in USDC (plain decimal, up to 8 places), e.g. 25.50');
      return;
    }

    const intentInput = { employeeId: selectedEmployee.id, amount };
    const fingerprint = withdrawIntentFingerprint(intentInput);

    // The durable unresolved record is authoritative. While a withdrawal
    // for THIS employee is unresolved, a DIFFERENT amount must not be
    // submitted: that would silently abandon an in-flight identity which
    // may have committed, and minting a fresh key in its place is exactly
    // the second-payout risk. Recovery of the unresolved request is
    // explicit (retry it, or discard it with a clear warning) — never a
    // silent bypass via a changed amount.
    const storedUnresolved = loadUnresolvedWithdrawIntent(selectedEmployee.id);
    if (storedUnresolved && storedUnresolved.fingerprint !== fingerprint) {
      toast.stop(`An earlier withdrawal of ${storedUnresolved.amount} USDC is still unresolved`, {
        description: 'That request may have gone through — retry the same amount (its original request ID is preserved and the backend cannot pay twice). A different amount cannot be submitted until the earlier request is authoritatively resolved; if the retry cannot complete, check this employee\'s EWA history and contact support for reconciliation.',
      });
      return;
    }

    // Same intent → reuse the identity (state copy, or the durable record
    // after a reopen/reload). A retry must reach the server's replay path.
    let key = resolveWithdrawIntentKey(withdrawIntent, intentInput)
      || (storedUnresolved && storedUnresolved.fingerprint === fingerprint ? storedUnresolved.key : null);
    if (!key) {
      // A genuinely new economic intent: cap-check it (advisory only; the
      // server re-validates with exact-decimal math) and mint a fresh key.
      if (exceedsCapHint(amount, employeeEwaEligibility?.maxWithdrawal)) {
        toast.stop(`Amount exceeds the maximum withdrawal limit of ${employeeEwaEligibility.maxWithdrawal} USDC`);
        return;
      }
      key = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `ewa_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      setWithdrawIntent({ key, fingerprint });
    }
    // FAIL CLOSED: no withdrawal leaves the browser without an identity that
    // is durably saved AND verified to read back. An unverifiable attempt
    // cannot be made safe to retry, so it is not sent at all.
    if (!ensureDurableWithdrawIntent({ employeeId: selectedEmployee.id, key, amount, fingerprint })) {
      toast.stop('Withdrawal blocked — the request identity could not be saved on this device', {
        description: 'An early wage withdrawal must keep a durable request ID so a retry can never pay twice. Resolve the browser storage issue (or try another device) and try again. If an earlier request may already have gone through, check the EWA history before proceeding.',
      });
      return;
    }

    setProcessingWithdrawal(true);
    let res;
    try {
      res = await ewaApi.withdraw({ ...intentInput, idempotencyKey: key });
    } catch (err) {
      if (isDefinitiveEwaRefusal(err)) {
        // The ONLY authoritative proof of a pre-commit refusal: HTTP 400 with
        // a message from the backend's documented refusal catalog (every
        // catalog entry throws inside the rolled-back Serializable
        // transaction). The durable record goes; the in-session key is kept
        // so an identical retry still reuses it.
        clearUnresolvedWithdrawIntent(selectedEmployee.id);
        toast.stop(err.message || 'Withdrawal refused by the server');
      } else {
        // UNRESOLVED — everything else keeps the identity: missing answers,
        // 408/409, the idempotency conflict (reconciliation state), ANY
        // non-catalog status or message (401/403/404/5xx, gateway errors,
        // unexpected 400s), and malformed 2xx envelopes. The intent's
        // identity is kept in state AND the durable store, so closing the
        // modal or reloading cannot silently erase it and a later retry
        // reuses the same key (backend replays, cannot pay twice).
        setWithdrawIntent(prev => (prev && prev.key === key)
          ? { ...prev, unresolved: true, amount }
          : { key, fingerprint, amount, unresolved: true });
        toast.stop('Connection lost — this withdrawal may have gone through', {
          description: 'The original request ID is preserved. Reopen this employee to retry the same request — the backend replays the committed withdrawal and cannot pay twice. If the retry cannot reach the server, check the EWA history and contact support for reconciliation.',
        });
      }
      setProcessingWithdrawal(false);
      return;
    }

    // A 2xx alone is NOT proof of the outcome: the envelope must carry the
    // authoritative financial result (success flags, finite economically
    // consistent gross/fee/net). A malformed 2xx is UNRESOLVED — the durable
    // identity is kept and the operator is directed to reconciliation.
    if (!isAuthoritativeWithdrawSuccess(res)) {
      setWithdrawIntent(prev => (prev && prev.key === key)
        ? { ...prev, unresolved: true, amount }
        : { key, fingerprint, amount, unresolved: true });
      toast.stop('Withdrawal outcome could not be confirmed — the server response was malformed', {
        description: 'The original request ID is preserved. Reopen this employee to retry the same request — the backend replays the committed withdrawal and cannot pay twice. If the retry cannot reach the server, check the EWA history and contact support for reconciliation.',
      });
      setProcessingWithdrawal(false);
      return;
    }

    // Validated authoritative success (or replay): the intent is settled.
    // Durable record removed — a genuinely new withdrawal mints a fresh
    // identity.
    clearUnresolvedWithdrawIntent(selectedEmployee.id);
    setWithdrawIntent(null);
    toast.go(describeWithdrawResult(res));
    setWithdrawAmount('');
    setProcessingWithdrawal(false);

    // Post-success refreshes are a SEPARATE concern from the withdrawal
    // outcome. A failed eligibility/history refresh must never misreport an
    // already-confirmed payout as unknown or refused.
    try {
      const [eligRes, histRes] = await Promise.all([
        ewaApi.eligibility(selectedEmployee.id),
        ewaApi.history(selectedEmployee.id)
      ]);
      setEmployeeEwaEligibility(eligRes?.data || null);
      setEmployeeEwaHistory(histRes?.data?.withdrawals || histRes?.withdrawals || []);
      fetchEwaData();
    } catch (refreshErr) {
      console.error(refreshErr);
      toast.neutral('Withdrawal confirmed by the server — EWA details failed to refresh', {
        description: 'The payout succeeded; only the on-screen balance/history failed to reload. Reopen the EWA portal to see the updated figures.',
      });
    }
  };

  // Render standard badge statuses
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return <Tag color="var(--f-warn)">Pending</Tag>;
      case 'PROCESSING':
        return <Tag color="var(--f-info)">Processing</Tag>;
      case 'READY':
        return <Tag color="var(--f-tint-color)">Ready</Tag>;
      case 'PAID':
        return <Tag color="var(--f-ok)">Paid</Tag>;
      case 'FAILED':
        return <Tag color="var(--f-bad)">Failed</Tag>;
      default:
        return <Tag color="var(--f-text-3)">{status}</Tag>;
    }
  };

  // Access Denied screen
  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <AlertCircle className="w-12 h-12 text-[var(--f-bad)] mb-4 animate-pulse" />
        <h2 className="text-xl font-bold mb-2">Access Denied</h2>
        <p className="text-[var(--f-text-3)] text-center max-w-md">
          You do not have the required permissions (`payroll.view`) to access the payroll management panel.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--f-text)] flex items-center gap-2">
            Payroll &amp; Earned Wage Access
          </h1>
          <p className="text-sm text-[var(--f-text-3)] mt-1">
            Manage your workforce compensation, process monthly disbursements, and administer flexible on-demand wages.
          </p>
        </div>

        {/* Tab selection */}
        <div className="flex bg-[var(--f-surface)] border border-[var(--f-line)] rounded-xl p-1 shrink-0 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('payroll')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'payroll'
                ? 'bg-[var(--f-tint-color)] text-[var(--f-ink-900)] az-glow-purple'
                : 'text-[var(--f-text-3)] hover:text-[var(--f-text)]'
            }`}
          >
            Payroll Dashboard
          </button>
          <button
            onClick={() => setActiveTab('ewa')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'ewa'
                ? 'bg-[var(--f-tint-color)] text-[var(--f-ink-900)] az-glow-purple'
                : 'text-[var(--f-text-3)] hover:text-[var(--f-text)]'
            }`}
          >
            EWA Management
          </button>
        </div>
      </div>

      {/* Main Tab Panels */}
      {activeTab === 'payroll' ? (
        <div className="space-y-6 animate-fade-in">
          {/* Controls row */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[var(--f-surface)] p-4 rounded-2xl border border-[var(--f-line)]">
            <div className="w-full sm:w-64">
              <Select
                label="Payroll Period"
                options={periods}
                value={currentPeriod}
                onChange={(e) => setCurrentPeriod(e.target.value)}
              />
            </div>
            {canProcess && (
              <Button
                variant="primary"
                onClick={handleProcessPayroll}
                loading={processingPayroll}
                disabled={loadingPayroll}
                className="w-full sm:w-auto"
              >
                <Zap className="w-4 h-4" />
                Process Payroll for {currentPeriod}
              </Button>
            )}
          </div>

          {/* Stats overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              label="Total Gross Wages"
              value={`$${(payrollSummary?.totalGross || 0).toFixed(2)}`}
              icon={DollarSign}
              loading={loadingPayroll}
            />
            <StatCard
              label="Total Net Wages"
              value={`$${(payrollSummary?.totalNet || 0).toFixed(2)}`}
              icon={Wallet}
              color="var(--f-ok)"
              loading={loadingPayroll}
            />
            <StatCard
              label="Total Deductions"
              value={`$${(payrollSummary?.totalDeductions || 0).toFixed(2)}`}
              icon={TrendingUp}
              color="var(--f-bad)"
              loading={loadingPayroll}
            />
            <StatCard
              label="EWA Deductions"
              value={`$${(payrollSummary?.ewaDeductions || 0).toFixed(2)}`}
              icon={ArrowUpCircle}
              color="var(--f-warn)"
              loading={loadingPayroll}
            />
            <StatCard
              label="Employee Count"
              value={payrollSummary?.count || 0}
              icon={Clock}
              color="var(--f-info)"
              loading={loadingPayroll}
            />
          </div>

          {/* Payroll List Card */}
          <Card className="overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 gap-4 border-b border-[var(--f-line)] mb-4">
              <div>
                <h3 className="text-lg font-bold">Payroll Registers</h3>
                <p className="text-xs text-[var(--f-text-3)] mt-1">
                  Individual details, rates, tax deductions, and disbursements for {currentPeriod}
                </p>
              </div>

              {canDisburse && payrollRecords.some(r => r.status === 'READY') && (
                <Button
                  variant="primary"
                  onClick={handleDisburseAll}
                  loading={disbursingAll}
                  className="w-full sm:w-auto bg-[var(--f-ok)] text-black"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Disburse All Ready Payments
                </Button>
              )}
            </div>

            {loadingPayroll ? (
              <div className="space-y-3 py-6">
                <Skel className="h-10 w-full" />
                <Skel className="h-14 w-full" />
                <Skel className="h-14 w-full" />
                <Skel className="h-14 w-full" />
              </div>
            ) : payrollRecords.length === 0 ? (
              <Empty
                icon={Calendar}
                title="No payroll runs found"
                description={`Payroll hasn't been generated or run for this period. Click 'Process Payroll' above to calculate wages.`}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--f-line)] text-[var(--f-text-3)] uppercase text-xs tracking-wider font-semibold">
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Pay Type</th>
                      <th className="py-3 px-4 text-right">Gross Amount</th>
                      <th className="py-3 px-4 text-right">Deductions / EWA</th>
                      <th className="py-3 px-4 text-right">Net Amount</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrollRecords.map((record) => {
                      const empName = record.employee?.user?.fullName || 'Unknown Employee';
                      const empAvatar = record.employee?.user?.avatarUrl;
                      const empRole = record.employee?.title || record.employee?.role || 'Staff';

                      return (
                        <tr
                          key={record.id}
                          className="border-b border-[var(--f-line)] last:border-0 hover:bg-[var(--f-surface)] transition-colors"
                        >
                          <td className="py-4 px-4 flex items-center gap-3">
                            <Avatar src={empAvatar} name={empName} size="sm" />
                            <div>
                              <p className="font-semibold text-[var(--f-text)]">{empName}</p>
                              <p className="text-xs text-[var(--f-text-3)]">{empRole}</p>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <Tag color="var(--f-tint-color)">{record.payrollType || 'SALARY'}</Tag>
                          </td>
                          <td className="py-4 px-4 text-right font-medium f-mono">
                            ${(record.grossAmount || 0).toFixed(2)}
                          </td>
                          <td className="py-4 px-4 text-right text-[var(--f-bad)] font-medium f-mono">
                            -${((record.deductionAmount || 0) + (record.ewaDeduction || 0)).toFixed(2)}
                            {record.ewaDeduction > 0 && (
                              <span className="block text-[10px] text-[var(--f-warn)]">
                                (inc. ${(record.ewaDeduction || 0).toFixed(2)} EWA)
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-right font-semibold text-[var(--f-ok)] f-mono">
                            ${(record.netAmount || 0).toFixed(2)}
                          </td>
                          <td className="py-4 px-4 text-center">
                            {renderStatusBadge(record.status)}
                          </td>
                          <td className="py-4 px-4 text-right space-x-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setSelectedRecord(record);
                                setIsBreakdownOpen(true);
                              }}
                            >
                              View Breakdown
                            </Button>
                            {canDisburse && record.status === 'READY' && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleDisburseSingle(record.id)}
                                loading={disbursingId === record.id}
                                className="bg-[var(--f-ok)] text-black"
                              >
                                Disburse
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          {/* EWA Stats overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              label="Total Accrued Across Employees"
              value={`$${(ewaSummary?.totalAccrued || 0).toFixed(2)}`}
              icon={TrendingUp}
              color="var(--f-ok)"
              loading={loadingEwa}
            />
            <StatCard
              label="Total Withdrawn Early (EWA)"
              value={`$${(ewaSummary?.totalWithdrawn || 0).toFixed(2)}`}
              icon={ArrowUpCircle}
              color="var(--f-tint-color)"
              loading={loadingEwa}
            />
            <StatCard
              label="Pending Request Actions"
              value={ewaSummary?.pendingRequests || 0}
              icon={Clock}
              color="var(--f-warn)"
              loading={loadingEwa}
            />
          </div>

          {/* EWA Employee List Card */}
          <Card>
            <div className="pb-6 border-b border-[var(--f-line)] mb-4">
              <h3 className="text-lg font-bold">Earned Wage Access (EWA) Registry</h3>
              <p className="text-xs text-[var(--f-text-3)] mt-1">
                Real-time tracking of employee accrued wages, early withdrawals, and eligibility limits.
              </p>
            </div>

            {loadingEwa ? (
              <div className="space-y-3 py-6">
                <Skel className="h-10 w-full" />
                <Skel className="h-14 w-full" />
                <Skel className="h-14 w-full" />
              </div>
            ) : employees.length === 0 ? (
              <Empty
                icon={Wallet}
                title="No employees found"
                description="Make sure you have registered employees in your business portal."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--f-line)] text-[var(--f-text-3)] uppercase text-xs tracking-wider font-semibold">
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4 text-right">Accrued Wages</th>
                      <th className="py-3 px-4 text-right">Withdrawn Early</th>
                      <th className="py-3 px-4 text-center">Eligibility</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => {
                      const empName = emp.user?.fullName || 'Unknown Employee';
                      const empAvatar = emp.user?.avatarUrl;
                      const empRole = emp.title || emp.role || 'Staff';
                      const eligibility = emp.ewa?.eligible ?? false;
                      const accrued = emp.ewa?.accruedWages || 0;
                      const withdrawn = emp.ewa?.totalWithdrawn || 0;

                      return (
                        <tr
                          key={emp.id}
                          className="border-b border-[var(--f-line)] last:border-0 hover:bg-[var(--f-surface)] transition-colors"
                        >
                          <td className="py-4 px-4 flex items-center gap-3">
                            <Avatar src={empAvatar} name={empName} size="sm" />
                            <div>
                              <p className="font-semibold text-[var(--f-text)]">{empName}</p>
                              <p className="text-xs text-[var(--f-text-3)]">{empRole}</p>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right font-medium text-[var(--f-ok)] f-mono">
                            ${accrued.toFixed(2)}
                          </td>
                          <td className="py-4 px-4 text-right text-[var(--f-warn)] font-medium f-mono">
                            ${withdrawn.toFixed(2)}
                          </td>
                          <td className="py-4 px-4 text-center">
                            {eligibility ? (
                              <Tag color="var(--f-ok)">Eligible</Tag>
                            ) : (
                              <Tag color="var(--f-bad)">Ineligible</Tag>
                            )}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleSelectEmployeeEwa(emp)}
                            >
                              Manage EWA
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* MODAL 1: View Breakdown Modal */}
      <Dialog
        open={isBreakdownOpen}
        onClose={() => {
          setIsBreakdownOpen(false);
          setSelectedRecord(null);
        }}
        title="Payroll Breakdown Detail"
      >
        {selectedRecord && (
          <div className="space-y-6">
            {/* Header info */}
            <div className="flex items-center gap-3 pb-4 border-b border-[var(--f-line)]">
              <Avatar
                src={selectedRecord.employee?.user?.avatarUrl}
                name={selectedRecord.employee?.user?.fullName || 'Employee'}
                size="md"
              />
              <div>
                <h4 className="font-bold text-[var(--f-text)]">
                  {selectedRecord.employee?.user?.fullName}
                </h4>
                <p className="text-xs text-[var(--f-text-3)]">
                  {selectedRecord.employee?.title || selectedRecord.employee?.role || 'Staff'} • {selectedRecord.period}
                </p>
              </div>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[var(--f-ink-900)] p-3 rounded-xl border border-[var(--f-line)]">
                  <p className="text-xs text-[var(--f-text-3)] font-semibold uppercase tracking-wider mb-1">Base Wages</p>
                  <p className="text-lg font-bold text-[var(--f-text)] f-mono">
                    ${(selectedRecord.baseAmount || 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-[var(--f-ink-900)] p-3 rounded-xl border border-[var(--f-line)]">
                  <p className="text-xs text-[var(--f-text-3)] font-semibold uppercase tracking-wider mb-1">Type</p>
                  <p className="text-sm font-bold text-[var(--f-tint-color)] mt-1">
                    {selectedRecord.payrollType || 'SALARY'}
                  </p>
                </div>
              </div>

              {/* Hours section (useful if hourly) */}
              <div className="grid grid-cols-2 gap-4 border-t border-[var(--f-line)] pt-4">
                <div>
                  <p className="text-xs text-[var(--f-text-3)] mb-1">Regular Hours</p>
                  <p className="text-sm font-semibold text-[var(--f-text)] f-mono">
                    {(selectedRecord.totalHours || 0).toFixed(1)} hrs
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--f-text-3)] mb-1">Overtime Hours</p>
                  <p className="text-sm font-semibold text-[var(--f-text)] f-mono">
                    {(selectedRecord.overtimeHours || 0).toFixed(1)} hrs
                  </p>
                </div>
              </div>

              {/* Earnings Table */}
              <div className="border-t border-[var(--f-line)] pt-4">
                <h5 className="text-xs font-bold text-[var(--f-text-3)] uppercase tracking-wider mb-3">Earnings</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--f-text-3)]">Regular Pay</span>
                    <span className="font-semibold f-mono">${(selectedRecord.baseAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--f-text-3)]">Overtime Wages</span>
                    <span className="font-semibold f-mono">${(selectedRecord.overtimeAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--f-text-3)]">Bonus Payments</span>
                    <span className="font-semibold text-[var(--f-ok)] f-mono">+${(selectedRecord.bonusAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--f-text-3)]">Tips &amp; Gratuities</span>
                    <span className="font-semibold text-[var(--f-ok)] f-mono">+${(selectedRecord.tipsAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-[var(--f-line)] pt-2 font-bold text-base">
                    <span>Gross Earnings</span>
                    <span className="f-mono">${(selectedRecord.grossAmount || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Deductions & Taxes Table */}
              <div className="border-t border-[var(--f-line)] pt-4">
                <h5 className="text-xs font-bold text-[var(--f-text-3)] uppercase tracking-wider mb-3">Deductions &amp; Taxes</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--f-text-3)]">Tax Withholdings</span>
                    <span className="font-semibold text-[var(--f-bad)] f-mono">-${(selectedRecord.taxAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--f-text-3)]">Voluntary Deductions</span>
                    <span className="font-semibold text-[var(--f-bad)] f-mono">-${(selectedRecord.deductionAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[var(--f-warn)] font-medium">
                    <span>Earned Wage Access (EWA)</span>
                    <span className="f-mono">-${(selectedRecord.ewaDeduction || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-[var(--f-line)] pt-2 font-bold text-base">
                    <span>Total Deductions</span>
                    <span className="text-[var(--f-bad)] f-mono">
                      -${((selectedRecord.deductionAmount || 0) + (selectedRecord.taxAmount || 0) + (selectedRecord.ewaDeduction || 0)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Final Net Pay */}
              <div className="border-t border-[var(--f-line)] pt-4 flex justify-between items-center bg-[var(--f-surface)] p-4 rounded-xl border border-[var(--f-line)]">
                <div>
                  <p className="text-xs text-[var(--f-text-3)] font-semibold uppercase tracking-wider">Net Disbursed Pay</p>
                  <p className="text-xs text-[var(--f-text-3)] mt-0.5">Final amount paid to employee</p>
                </div>
                <p className="text-2xl font-black text-[var(--f-ok)] f-mono">
                  ${(selectedRecord.netAmount || 0).toFixed(2)}
                </p>
              </div>

              {/* Status details */}
              {selectedRecord.paidAt && (
                <div className="text-xs text-[var(--f-text-3)] text-right">
                  Paid on {new Date(selectedRecord.paidAt).toLocaleDateString()}
                </div>
              )}
              {selectedRecord.status === 'FAILED' && selectedRecord.failureReason && (
                <div className="p-3 bg-[var(--f-bad)]1a rounded-lg border border-[var(--f-bad)]30 text-xs text-[var(--f-bad)]">
                  <strong>Disbursement Failed:</strong> {selectedRecord.failureReason}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--f-line)]">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsBreakdownOpen(false);
                  setSelectedRecord(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* MODAL 2: EWA Manage Modal */}
      <Dialog
        open={isEwaModalOpen}
        onClose={() => {
          setIsEwaModalOpen(false);
          setSelectedEmployee(null);
          setEmployeeEwaEligibility(null);
          setEmployeeEwaHistory([]);
          // The in-memory intent copy can go. An UNRESOLVED intent (no
          // server answer) is NOT abandoned here: its identity lives in the
          // durable store and is explicitly recovered — banner + prefilled
          // retry — when this employee's EWA portal is reopened, so closing
          // the modal never silently erases a request that may have committed.
          setWithdrawIntent(null);
        }}
        title="Earned Wage Access (EWA) Portal"
      >
        {selectedEmployee && (
          <div className="space-y-6">
            {/* Header profile */}
            <div className="flex items-center gap-3 pb-4 border-b border-[var(--f-line)]">
              <Avatar
                src={selectedEmployee.user?.avatarUrl}
                name={selectedEmployee.user?.fullName || 'Employee'}
                size="md"
              />
              <div>
                <h4 className="font-bold text-[var(--f-text)]">
                  {selectedEmployee.user?.fullName}
                </h4>
                <p className="text-xs text-[var(--f-text-3)]">
                  {selectedEmployee.title || selectedEmployee.role || 'Staff'}
                </p>
              </div>
            </div>

            {loadingEmployeeEwa ? (
              <div className="space-y-4 py-10">
                <Skel className="h-10 w-full" />
                <Skel className="h-20 w-full" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Eligibility status */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--f-ink-900)] border border-[var(--f-line)]">
                  <div>
                    <span className="text-xs text-[var(--f-text-3)] uppercase tracking-wider font-semibold">Eligibility Limit</span>
                    <p className="text-2xl font-bold text-[var(--f-text)] mt-1 f-mono">
                      ${(employeeEwaEligibility?.accruedWages || 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-[var(--f-text-3)] mt-1">Total earned up to current shift</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-[var(--f-text-3)] uppercase tracking-wider font-semibold">Available early</span>
                    <p className="text-2xl font-bold text-[var(--f-ok)] mt-1 f-mono">
                      ${(employeeEwaEligibility?.maxWithdrawal || 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-[var(--f-text-3)] mt-1">Limit minus current withdrawals</p>
                  </div>
                </div>

                {/* Progress bar visualizing maximum early withdrawal allocation */}
                <div>
                  <div className="flex justify-between text-xs font-semibold text-[var(--f-text-3)] mb-1.5 uppercase tracking-wider">
                    <span>Early Access Allocation Usage</span>
                    <span className="f-mono">
                      ${((employeeEwaEligibility?.accruedWages || 0) - (employeeEwaEligibility?.maxWithdrawal || 0)).toFixed(2)} / ${(employeeEwaEligibility?.accruedWages || 0).toFixed(2)}
                    </span>
                  </div>
                  <Progress
                    value={(employeeEwaEligibility?.accruedWages || 0) - (employeeEwaEligibility?.maxWithdrawal || 0)}
                    max={employeeEwaEligibility?.accruedWages || 100}
                    color="var(--f-tint-color)"
                  />
                </div>

                {/* Eligibility criteria badge info */}
                <div className="flex items-center justify-between border-t border-b border-[var(--f-line)] py-3">
                  <span className="text-sm font-semibold">Current EWA Status</span>
                  {employeeEwaEligibility?.eligible ? (
                    <Tag color="var(--f-ok)">Eligible for Withdrawal</Tag>
                  ) : (
                    <Tag color="var(--f-bad)">Locked / Ineligible</Tag>
                  )}
                </div>

                {/* Unresolved withdrawal recovery — the only path that can
                    retire an unknown-outcome request is an explicit operator
                    action: retry the preserved request, or discard it. */}
                {withdrawIntent?.unresolved && (
                  <div
                    data-testid="unresolved-withdrawal-banner"
                    className="rounded-md border border-[var(--f-warn)] p-3"
                    style={{ background: 'rgba(234,179,8,0.08)' }}
                  >
                    <p className="text-sm font-semibold text-[var(--f-warn)]">
                      Unresolved withdrawal — {withdrawIntent.amount} USDC may have gone through
                    </p>
                    <p className="text-xs text-[var(--f-text-3)] mt-1">
                      An earlier request for this employee received no server answer. Its original request ID is preserved: retrying the same amount reuses it, so the backend replays the committed withdrawal and cannot pay twice. The request cannot be discarded — it stays preserved until the server gives an authoritative answer.
                    </p>
                    <p className="text-xs text-[var(--f-text-3)] mt-1">
                      If the retry cannot reach the server, check this employee&rsquo;s EWA history for the committed withdrawal and contact support for manual reconciliation.
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={handleWithdrawEwaSubmit}
                        className="bg-[var(--f-warn)] text-black"
                      >
                        Retry same request
                      </Button>
                    </div>
                  </div>
                )}

                {/* Withdrawal Form */}
                {employeeEwaEligibility?.eligible && employeeEwaEligibility?.maxWithdrawal > 0 && (
                  <form onSubmit={handleWithdrawEwaSubmit} className="space-y-4">
                    <div className="relative">
                      <Input
                        label="Withdraw Amount"
                        placeholder="0.00"
                        // The documented contract is an exact decimal string
                        // with up to 8 decimal places. A native number input
                        // (step 0.01) rejects that precision in the browser,
                        // so the input is text + inputMode with a pattern
                        // matching the contract exactly — the value stays a
                        // byte-exact string and normalizeAmountInput()
                        // re-validates it before submit. The cap remains a
                        // UI-side hint; the server re-validates authoritatively.
                        type="text"
                        inputMode="decimal"
                        pattern="\d+(\.\d{1,8})?"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        required
                        className="pr-16 f-mono"
                      />
                      <div className="absolute right-4 bottom-3 text-sm font-bold text-[var(--f-text-3)]">
                        USDC
                      </div>
                    </div>

                    {canProcess && (
                      <Button
                        type="submit"
                        variant="primary"
                        loading={processingWithdrawal}
                        className="w-full bg-[var(--f-ok)] text-black"
                      >
                        <Zap className="w-4 h-4" />
                        Disburse Early Wage Advance
                      </Button>
                    )}
                  </form>
                )}

                {/* Withdrawal History List */}
                <div className="border-t border-[var(--f-line)] pt-4">
                  <h5 className="text-xs font-bold text-[var(--f-text-3)] uppercase tracking-wider mb-3">Withdrawal History</h5>
                  {employeeEwaHistory.length === 0 ? (
                    <p className="text-xs text-[var(--f-text-3)] text-center py-4">No early wage withdrawals processed this cycle.</p>
                  ) : (
                    <div className="space-y-2.5 max-h-40 overflow-y-auto">
                      {employeeEwaHistory.map((w, idx) => (
                        <div
                          key={w.id || idx}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--f-surface)] border border-[var(--f-line)] text-xs"
                        >
                          <div>
                            <p className="font-semibold text-[var(--f-text)] f-mono">${(w.amount || 0).toFixed(2)} USDC</p>
                            <p className="text-[10px] text-[var(--f-text-3)]">
                              {w.timestamp ? new Date(w.timestamp).toLocaleString() : 'Recent withdrawal'}
                            </p>
                          </div>
                          <Tag color="var(--f-ok)">Processed</Tag>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--f-line)]">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsEwaModalOpen(false);
                  setSelectedEmployee(null);
                  setEmployeeEwaEligibility(null);
                  setEmployeeEwaHistory([]);
                  setWithdrawIntent(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
