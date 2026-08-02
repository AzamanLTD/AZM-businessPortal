import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { restaurantOpsApi as restaurantApi, employeeApi } from '@/lib/marketplaceApi';
import { Card, Button, Tag, Skel, Empty, Spinner } from '@/components/instrument';
import { toast } from 'sonner';
import { usePermission } from '@/hooks/usePermission';
import { getSocket } from '@/lib/socket';
import {
  ChefHat,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RefreshCw,
  TrendingUp,
  ListOrdered,
  Hourglass,
  LayoutGrid,
  Sparkles,
  UserPlus,
  Play,
  RotateCcw,
  Ban
} from 'lucide-react';

// Static configs
const DEFAULT_STATIONS = ['GRILL', 'FRY', 'SAUTE', 'COLD', 'BAR', 'EXPEDITE'];
const STATION_COLORS = {
  GRILL: 'var(--stop)',
  FRY: 'var(--hold)',
  SAUTE: 'var(--info)',
  COLD: 'var(--accent)',
  BAR: 'var(--accent)',
  EXPEDITE: 'var(--go)',
  DESSERT: 'var(--accent)'
};

const ORDER_STATUS_COLORS = {
  NEW: 'var(--info)',
  PREPARING: 'var(--hold)',
  READY: 'var(--go)',
  SERVED: 'var(--text-3)',
  CANCELLED: 'var(--stop)'
};

// KDS styles moved to forge.css — no more dangerouslySetInnerHTML
const PulseAlert = () => null;

// Helper to play synthesized beep sounds or Web Audio alerts
const playAlertSound = (type = 'new-order') => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'rush') {
      // High pitch double beep
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
      
      setTimeout(() => {
        const ctx2 = new AudioContext();
        const osc2 = ctx2.createOscillator();
        const gain2 = ctx2.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx2.destination);
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(880, ctx2.currentTime);
        gain2.gain.setValueAtTime(0.15, ctx2.currentTime);
        osc2.start();
        osc2.stop(ctx2.currentTime + 0.15);
      }, 200);
    } else if (type === 'warning') {
      // Alarm pulse
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } else {
      // Gentle standard beep
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch (err) {
    console.warn('Could not play synthesized audio alert:', err);
  }
};

// Ticket Timer Component
function TicketTimer({ sentAt, prepTimeMinutes = 15, onThresholdReached }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const calculate = () => {
      const elapsedMs = Date.now() - new Date(sentAt).getTime();
      setSeconds(Math.max(0, Math.floor(elapsedMs / 1000)));
    };
    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [sentAt]);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const progressRatio = mins / (prepTimeMinutes || 1);

  // Determine warning levels
  const isOvertime = mins >= prepTimeMinutes;
  const isWarning = !isOvertime && progressRatio >= 0.75; // 75% of prep time reached

  // Emit event if threshold is crossed to trigger sounds
  const lastState = useRef({ isWarning, isOvertime });
  useEffect(() => {
    if (isOvertime && !lastState.current.isOvertime) {
      onThresholdReached?.('overtime');
    } else if (isWarning && !lastState.current.isWarning) {
      onThresholdReached?.('warning');
    }
    lastState.current = { isWarning, isOvertime };
  }, [isWarning, isOvertime, onThresholdReached]);

  let statusColor = 'var(--go)';
  let pulseClass = '';

  if (isOvertime) {
    statusColor = 'var(--stop)';
    pulseClass = 'pulse-red';
  } else if (isWarning) {
    statusColor = 'var(--hold)';
    pulseClass = 'pulse-amber';
  }

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold font-mono ${pulseClass}`} style={{ color: statusColor, background: `${statusColor}15`, border: `1px solid ${statusColor}30` }}>
      <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: isOvertime ? '3s' : '8s' }} />
      <span>{mins}:{secs.toString().padStart(2, '0')}</span>
      <span className="text-[10px] opacity-75 font-sans">/ {prepTimeMinutes}m</span>
    </div>
  );
}

export default function RestaurantKitchen() {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermission();

  // Component states
  const [selectedStation, setSelectedStation] = useState('ALL');
  const [customStations, setCustomStations] = useState(DEFAULT_STATIONS);
  const [newStationName, setNewStationName] = useState('');
  const [isKioskMode, setIsKioskMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // active, served, all
  const [searchTerm, setSearchTerm] = useState('');

  const canView = hasPermission('kitchen.view') || hasPermission('*');
  const canManage = hasPermission('kitchen.manage') || hasPermission('*');

  // Query: Kitchen Orders
  const { data: ordersResponse, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['kitchenOrders', selectedStation, activeTab],
    queryFn: async () => {
      const statusParam = activeTab === 'active' ? undefined : (activeTab === 'served' ? 'SERVED' : 'ALL');
      const params = {};
      if (statusParam) params.status = statusParam;
      if (selectedStation !== 'ALL') params.station = selectedStation;
      return restaurantApi.kitchenOrders(params);
    },
    refetchInterval: 15000, // Auto-refresh every 15 seconds
    enabled: canView
  });

  // Query: KDS stats
  const { data: statsResponse, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['kdsStats'],
    queryFn: () => restaurantApi.getKitchenStats(),
    refetchInterval: 15000,
    enabled: canView
  });

  // Query: Employees (to assign chefs)
  const { data: employeesResponse } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeeApi.getEmployees(),
    enabled: canView
  });

  const orders = ordersResponse?.data?.orders || [];
  const stats = statsResponse?.data || { avgTicketTime: 0, queueCount: {}, longestWait: 0 };
  const employees = employeesResponse?.employees || [];

  // Mutations
  const bumpMutation = useMutation({
    mutationFn: (orderId) => restaurantApi.bumpKitchenOrder(orderId),
    onSuccess: () => {
      toast.success('Order bumped successfully');
      queryClient.invalidateQueries(['kitchenOrders']);
      queryClient.invalidateQueries(['kdsStats']);
    },
    onError: (err) => {
      toast.error(`Failed to bump order: ${err.message}`);
    }
  });

  const itemStatusMutation = useMutation({
    mutationFn: ({ orderId, itemId, status }) => restaurantApi.updateItemStatus(orderId, itemId, status),
    onSuccess: () => {
      queryClient.invalidateQueries(['kitchenOrders']);
      queryClient.invalidateQueries(['kdsStats']);
    },
    onError: (err) => {
      toast.error(`Failed to update item status: ${err.message}`);
    }
  });

  const assignChefMutation = useMutation({
    mutationFn: ({ orderId, chefId }) => restaurantApi.assignChef(orderId, chefId),
    onSuccess: () => {
      toast.success('Chef assigned');
      queryClient.invalidateQueries(['kitchenOrders']);
    },
    onError: (err) => {
      toast.error(`Failed to assign chef: ${err.message}`);
    }
  });

  const toggle86Mutation = useMutation({
    mutationFn: (data) => restaurantApi.toggle86(data),
    onSuccess: (res) => {
      toast.success(res.message || '86 status toggled');
    },
    onError: (err) => {
      toast.error(`Failed to toggle 86 item: ${err.message}`);
    }
  });

  // Sound triggers for overtime / alert events
  const handleThresholdReached = (type) => {
    if (!soundEnabled) return;
    if (type === 'overtime') {
      playAlertSound('rush');
    } else {
      playAlertSound('warning');
    }
  };

  // Socket.io integration for realtime updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewOrder = (newOrder) => {
      // Check if it belongs to currently selected station
      if (selectedStation === 'ALL' || newOrder.station === selectedStation) {
        if (soundEnabled) {
          playAlertSound(newOrder.isRush ? 'rush' : 'new-order');
        }
        toast('New Kitchen Order Received!', {
          description: `Ticket #${newOrder.ticketNumber} for Table ${newOrder.tableNumber}`,
          action: {
            label: 'Refresh',
            onClick: () => {
              refetch();
              refetchStats();
            }
          }
        });
        queryClient.invalidateQueries(['kitchenOrders']);
        queryClient.invalidateQueries(['kdsStats']);
      }
    };

    const handleUpdateOrder = () => {
      queryClient.invalidateQueries(['kitchenOrders']);
      queryClient.invalidateQueries(['kdsStats']);
    };

    socket.on('kds_new_order', handleNewOrder);
    socket.on('kds_order_updated', handleUpdateOrder);

    return () => {
      socket.off('kds_new_order', handleNewOrder);
      socket.off('kds_order_updated', handleUpdateOrder);
    };
  }, [selectedStation, soundEnabled, queryClient, refetch, refetchStats]);

  // Action Handlers
  const handleAddStation = (e) => {
    e.preventDefault();
    if (!newStationName.trim()) return;
    const cleanName = newStationName.trim().toUpperCase();
    if (customStations.includes(cleanName)) {
      toast.error('Station already exists');
      return;
    }
    setCustomStations([...customStations, cleanName]);
    setNewStationName('');
    toast.success(`Station ${cleanName} added!`);
  };

  const handleRemoveStation = (stationToRemove) => {
    setCustomStations(customStations.filter(s => s !== stationToRemove));
    if (selectedStation === stationToRemove) {
      setSelectedStation('ALL');
    }
    toast.success(`Station ${stationToRemove} removed`);
  };

  const handleToggleItemStatus = (orderId, item) => {
    if (!canManage) {
      toast.error('You do not have permission to manage the kitchen');
      return;
    }
    // Toggle: NEW -> PREPARING -> READY -> SERVED
    const statusCycle = ['NEW', 'PREPARING', 'READY', 'SERVED'];
    const currentIndex = statusCycle.indexOf(item.status || 'NEW');
    const nextIndex = (currentIndex + 1) % statusCycle.length;
    const nextStatus = statusCycle[nextIndex];

    itemStatusMutation.mutate({ orderId, itemId: item._id || item.id, status: nextStatus });
  };

  const handleToggle86 = (itemName) => {
    toggle86Mutation.mutate({ name: itemName });
  };

  // Filter logic
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.ticketNumber?.toString().includes(searchTerm) ||
      order.tableNumber?.toString().includes(searchTerm) ||
      order.serverName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.items?.some(it => it.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesSearch;
  });

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center" style={{ color: 'var(--text)' }}>
        <Ban className="w-16 h-16 text-[var(--stop)] mb-4" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-sm text-[var(--text-3)] mt-1 max-w-sm">
          You do not have the required permissions (`kitchen.view`) to access the Kitchen Display System.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isKioskMode ? 'kds-kiosk p-4 bg-[var(--f-bg)] min-h-screen' : ''}`} style={{ color: 'var(--text)' }}>
      <PulseAlert />

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-[var(--accent)]" />
            <h1 className="text-2xl font-bold tracking-tight">Kitchen Display System (KDS)</h1>
            {isFetching && <Spinner size="sm" />}
          </div>
          <p className="text-sm text-[var(--text-3)] mt-0.5">
            Realtime operations hub, item-level bumping, and ticket pacing controls.
          </p>
        </div>

        {/* SYSTEM CONTROLS */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Search tickets, tables, items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs bg-[var(--surface)] border border-[var(--line)] focus:outline-none focus:border-[var(--accent)] text-[var(--text)] placeholder-[var(--text-3)]"
          />

          <Button
            size="sm"
            variant="secondary"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Mute Alerts' : 'Unmute Alerts'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-[var(--accent)]" /> : <VolumeX className="w-4 h-4 text-[var(--text-3)]" />}
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => setIsKioskMode(!isKioskMode)}
            title="Toggle Kiosk Screen Mode"
          >
            {isKioskMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              refetch();
              refetchStats();
              toast.success('Board refreshed manually');
            }}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* STATS BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="flex items-center justify-between p-4 bg-[var(--surface)] border border-[var(--line)] rounded-2xl">
          <div>
            <span className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider block">Average Ticket Pace</span>
            <span className="text-xl font-bold block mt-1 font-mono text-[var(--accent)]">{stats.avgTicketTime || 0}m</span>
          </div>
          <TrendingUp className="w-8 h-8 text-[var(--accent)] opacity-30" />
        </Card>

        <Card className="flex items-center justify-between p-4 bg-[var(--surface)] border border-[var(--line)] rounded-2xl">
          <div>
            <span className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider block">Tickets in Queue</span>
            <span className="text-xl font-bold block mt-1 font-mono text-[var(--hold)]">
              {Object.values(stats.queueCount || {}).reduce((a, b) => a + b, 0)} Active
            </span>
          </div>
          <ListOrdered className="w-8 h-8 text-[var(--hold)] opacity-30" />
        </Card>

        <Card className="flex items-center justify-between p-4 bg-[var(--surface)] border border-[var(--line)] rounded-2xl">
          <div>
            <span className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider block">Longest Wait Ticket</span>
            <span className="text-xl font-bold block mt-1 font-mono text-[var(--stop)]">{stats.longestWait || 0}m</span>
          </div>
          <Hourglass className="w-8 h-8 text-[var(--stop)] opacity-30" />
        </Card>

        <Card className="p-4 bg-[var(--surface)] border border-[var(--line)] rounded-2xl">
          <span className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider block mb-2">Station Loadout</span>
          <div className="flex flex-wrap gap-1.5 max-h-[48px] overflow-y-auto">
            {Object.entries(stats.queueCount || {}).map(([st, count]) => (
              <Tag key={st} color={STATION_COLORS[st] || 'var(--text-3)'} className="text-[10px] font-mono">
                {st}: {count}
              </Tag>
            ))}
          </div>
        </Card>
      </div>

      {/* FILTER & STATION CONFIG TABS */}
      <div className="border-b border-[var(--line)] pb-4 flex flex-col gap-4">
        {/* TABS SELECTOR */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex border border-[var(--line)] rounded-xl overflow-hidden p-1 bg-[var(--f-bg)]">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'active' ? 'bg-[var(--accent)] text-black' : 'text-[var(--text-3)]:text-[var(--text)]'}`}
            >
              Active Kitchen Queue
            </button>
            <button
              onClick={() => setActiveTab('served')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'served' ? 'bg-[var(--accent)] text-black' : 'text-[var(--text-3)]:text-[var(--text)]'}`}
            >
              Completed / Served Lane
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'all' ? 'bg-[var(--accent)] text-black' : 'text-[var(--text-3)]:text-[var(--text)]'}`}
            >
              All Tickets (History)
            </button>
          </div>

          {/* STATION CREATOR */}
          <form onSubmit={handleAddStation} className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder="New station name..."
              value={newStationName}
              onChange={(e) => setNewStationName(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs bg-[var(--surface)] border border-[var(--line)] focus:outline-none focus:border-[var(--accent)] text-[var(--text)] uppercase"
            />
            <Button size="sm" type="submit" variant="outline" className="h-[32px] gap-1">
              <Sparkles className="w-3 h-3 text-[var(--accent)]" /> Add Station
            </Button>
          </form>
        </div>

        {/* STATION FILTER SELECTION BAR */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs font-semibold text-[var(--text-3)] mr-2 uppercase tracking-wider">Stations:</span>
          <button
            onClick={() => setSelectedStation('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${selectedStation === 'ALL' ? 'bg-[var(--accent)] text-black border-transparent' : 'border-[var(--line)] text-[var(--text-3)]:text-[var(--text)]'}`}
          >
            ALL STATIONS
          </button>
          {customStations.map(st => {
            const hasActiveOrders = orders.some(o => o.station === st || o.items?.some(it => it.station === st));
            return (
              <div key={st} className="inline-flex items-center gap-0.5 border border-[var(--line)] rounded-xl overflow-hidden bg-[var(--surface)]">
                <button
                  onClick={() => setSelectedStation(st)}
                  className={`px-3 py-1.5 text-xs font-bold transition-all`}
                  style={selectedStation === st ? { background: STATION_COLORS[st] || 'var(--accent)', color: '#000' } : { color: STATION_COLORS[st] || 'var(--text)' }}
                >
                  {st} {hasActiveOrders && '•'}
                </button>
                <button
                  onClick={() => handleRemoveStation(st)}
                  className="px-1.5 py-1.5 text-[10px] text-[var(--text-3)]:text-[var(--stop)]:bg-[var(--line)] border-l border-[var(--line)]"
                  title={`Remove ${st}`}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ERROR LOADING LOADING STATE */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, idx) => (
            <Skel key={idx} className="h-64 rounded-2xl" />
          ))}
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center justify-center py-12 bg-[var(--surface)] border border-[var(--line)] rounded-2xl text-center">
          <AlertTriangle className="w-12 h-12 text-[var(--stop)] mb-3" />
          <p className="text-base font-bold">Failed to sync kitchen queue</p>
          <p className="text-sm text-[var(--text-3)] mt-1 mb-4">{error?.message || 'Error occurred while fetching orders'}</p>
          <Button onClick={refetch}>Retry Connection</Button>
        </div>
      )}

      {/* TICKET DISPLAY GRID */}
      {!isLoading && !isError && filteredOrders.length === 0 && (
        <Empty
          icon={ChefHat}
          title="Kitchen board is clear"
          description="Ready for service. Incoming dine-in and guest tickets will arrive in real-time."
        />
      )}

      {!isLoading && !isError && filteredOrders.length > 0 && (
        <div className="kds-grid">
          {filteredOrders.map(order => {
            const hasAllergies = order.allergyAlerts && order.allergyAlerts.length > 0;
            const isRush = order.isRush;

            // Compute percentage-done for expo view visual progress
            const totalItems = order.items?.length || 0;
            const completedItems = order.items?.filter(it => ['READY', 'SERVED'].includes(it.status))?.length || 0;
            const allItemsDone = totalItems > 0 && totalItems === completedItems;

            return (
              <Card
                key={order._id || order.id}
                className={`flex flex-col justify-between overflow-hidden relative border border-[var(--line)] rounded-2xl ${
                  isRush ? 'kds-card-rush' : ''
                }`}
                style={{
                  background: 'var(--surface)',
                  minHeight: '280px'
                }}
              >
                {/* RUSH BANNER OVERLAY */}
                {isRush && (
                  <div className="bg-[var(--stop)] text-black text-[10px] font-black tracking-widest text-center py-1 uppercase select-none">
                    ⚠️ RUSH TICKET ⚠️
                  </div>
                )}

                {/* TICKET HEADER */}
                <div className="p-4 border-b border-[var(--line)] flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-black font-mono bg-[var(--line)] px-2 py-0.5 rounded-md text-[var(--text)]">
                        #{order.ticketNumber || 'EXP'}
                      </span>
                      <span className="text-base font-bold">Table {order.tableNumber || 'BAR'}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1 mt-1">
                      <span className="text-xs text-[var(--text-3)]">Server: {order.serverName || 'Guest'}</span>
                      {order.station && (
                        <Tag color={STATION_COLORS[order.station] || 'var(--text-3)'} className="text-[10px]">
                          {order.station}
                        </Tag>
                      )}
                    </div>
                  </div>

                  {/* TIMERS */}
                  <div className="flex flex-col items-end gap-1">
                    <TicketTimer
                      sentAt={order.sentAt || order.createdAt}
                      prepTimeMinutes={order.prepTimeMinutes || 15}
                      onThresholdReached={handleThresholdReached}
                    />
                    <Tag color={ORDER_STATUS_COLORS[order.status]} className="text-[9px] uppercase">
                      {order.status}
                    </Tag>
                  </div>
                </div>

                {/* ALLERGIES ALERTS */}
                {hasAllergies && (
                  <div className="bg-red-600 bg-opacity-20 border-y border-red-500/30 px-4 py-1.5 flex items-center gap-2 text-xs text-[var(--stop)] font-black uppercase tracking-wide animate-pulse">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>ALLERGY ALERT: {order.allergyAlerts.join(', ')}</span>
                  </div>
                )}

                {/* SPECIAL INSTRUCTIONS */}
                {order.specialInstructions && (
                  <div className="bg-[var(--f-bg)] px-4 py-1.5 border-b border-[var(--line)] text-xs font-semibold text-[var(--hold)] italic">
                    💡 "{order.specialInstructions}"
                  </div>
                )}

                {/* DISHES LIST */}
                <div className="flex-1 p-4 space-y-3 divide-y divide-[var(--line)] max-h-[300px] overflow-y-auto">
                  {order.items?.map((item, index) => {
                    const isItemReady = ['READY', 'SERVED'].includes(item.status);
                    const isItemPreparing = item.status === 'PREPARING';

                    return (
                      <div
                        key={item._id || index}
                        className={`pt-2 first:pt-0 group flex items-start justify-between gap-2 transition-all ${
                          isItemReady ? 'opacity-40' : ''
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-base font-bold font-mono text-[var(--accent)]">
                              {item.quantity}×
                            </span>
                            <span
                              className={`text-sm font-bold ${
                                isItemReady ? 'line-through text-[var(--text-3)]' : 'text-[var(--text)]'
                              }`}
                            >
                              {item.name}
                            </span>
                            {item.station && (
                              <span
                                className="text-[9px] font-mono font-bold px-1 py-0.2 rounded"
                                style={{
                                  color: STATION_COLORS[item.station] || 'var(--text-3)',
                                  background: `${STATION_COLORS[item.station]}15`
                                }}
                              >
                                {item.station}
                              </span>
                            )}
                          </div>

                          {/* MODIFIERS */}
                          {item.modifiers && item.modifiers.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1 pl-6">
                              {item.modifiers.map((mod, modIdx) => (
                                <span
                                  key={modIdx}
                                  className="text-[10px] font-semibold bg-[var(--f-bg)] border border-[var(--line)] px-1.5 py-0.5 rounded text-[var(--text-3)]"
                                >
                                  + {mod}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* ITEM BUMP CONTROLS */}
                        {canManage && (
                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleToggleItemStatus(order._id || order.id, item)}
                              className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${
                                isItemReady
                                  ? 'bg-[var(--go)] text-black border-transparent'
                                  : isItemPreparing
                                  ? 'bg-[var(--hold)] text-black border-transparent'
                                  : 'bg-[var(--surface)] text-[var(--text-3)] border-[var(--line)]:border-[var(--accent)]'
                              }`}
                              title={`Change Status (Current: ${item.status || 'NEW'})`}
                            >
                              {isItemReady ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              ) : isItemPreparing ? (
                                <Play className="w-3.5 h-3.5 animate-pulse" />
                              ) : (
                                <Clock className="w-3.5 h-3.5" />
                              )}
                              <span className="text-[10px] font-mono">{item.status || 'NEW'}</span>
                            </button>

                            {/* 86 Toggle */}
                            <button
                              onClick={() => handleToggle86(item.name)}
                              className="p-1 rounded bg-[var(--f-bg)]:bg-[var(--stop)]:text-black border border-[var(--line)] text-[var(--text-3)] text-[10px]"
                              title="Toggle 86'ed (Out of Stock)"
                            >
                              86
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* BOTTOM ACTION FOOTER */}
                <div className="p-4 bg-[var(--f-bg)] border-t border-[var(--line)] flex items-center justify-between gap-2">
                  {/* Chef Assignment Selector */}
                  <div className="flex items-center gap-1">
                    <select
                      className="text-[10px] font-semibold bg-[var(--surface)] border border-[var(--line)] rounded-md py-1 px-1.5 outline-none max-w-[110px]"
                      value={order.employeeId || ''}
                      onChange={(e) => {
                        if (!canManage) {
                          toast.error('Permission denied to assign chefs');
                          return;
                        }
                        assignChefMutation.mutate({ orderId: order._id || order.id, chefId: e.target.value });
                      }}
                      disabled={!canManage}
                    >
                      <option value="">Assign Chef</option>
                      {employees.map(emp => (
                        <option key={emp._id || emp.id} value={emp._id || emp.id}>
                          {emp.name || emp.firstName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Entire Ticket Bumping Action */}
                  {canManage && (
                    <Button
                      size="sm"
                      variant={allItemsDone ? 'primary' : 'outline'}
                      className={`gap-1.5 text-xs py-1.5 font-bold transition-all ${
                        allItemsDone ? 'pulse-amber bg-[var(--go)] text-black' : ''
                      }`}
                      onClick={() => bumpMutation.mutate(order._id || order.id)}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {allItemsDone ? 'Expo Serve (Ready)' : 'Bump Ticket'}
                    </Button>
                  )}
                </div>

                {/* Visual completion tracker bar */}
                {totalItems > 0 && (
                  <div className="w-full bg-[var(--line)] h-1.5 overflow-hidden">
                    <div
                      className="bg-[var(--go)] h-full transition-all duration-300"
                      style={{ width: `${(completedItems / totalItems) * 100}%` }}
                    />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
