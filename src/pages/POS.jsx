/**
 * POS — Point of Sale (Section 2, Phase 2)
 * Touch-optimized, offline-aware, cash + AZM balance + split payments.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { products as productsApi } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import { request } from '@/lib/apiCore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  ShoppingCart, Plus, Minus, X, Trash2, CreditCard, Banknote,
  SplitSquareHorizontal, CheckCircle2, Printer, Search,
  Wifi, WifiOff, Clock, Package, Utensils, Coffee,
  ShoppingBag, Zap, RefreshCw, Tag
} from 'lucide-react';

const fmt = (n) => `GHS ${Number(n || 0).toFixed(2)}`;
const CAT_ICONS = { food: Utensils, drink: Coffee, beverage: Coffee, retail: ShoppingBag, product: Package };
const OUTBOX_KEY = 'az_pos_outbox';
const readOutbox = () => { try { return JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]'); } catch { return []; } };
const writeOutbox = (items) => localStorage.setItem(OUTBOX_KEY, JSON.stringify(items));
const enqueue = (action) => { const b = readOutbox(); b.push({ ...action, id: crypto.randomUUID(), ts: Date.now(), status: 'PENDING' }); writeOutbox(b); };

function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true); const off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}

function ReceiptModal({ order, bizName, onClose }) {
  const now = new Date().toLocaleString('en-GH', { dateStyle: 'medium', timeStyle: 'short' });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
        <div style={{ background: 'var(--az-accent)' }} className="p-6 text-center text-white">
          <div className="text-2xl font-bold">{bizName || 'AZM POS'}</div>
          <div className="text-white/80 text-sm mt-1">{now}</div>
        </div>
        <div className="p-5 space-y-2">
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-gray-700">{item.qty}× {item.name}</span>
              <span className="font-semibold tabular-nums">{fmt(item.price * item.qty)}</span>
            </div>
          ))}
          <div className="border-t border-gray-200 my-2 pt-2 flex justify-between font-bold text-base">
            <span>Total</span><span className="tabular-nums" style={{ color: 'var(--az-accent)' }}>{fmt(order.total)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>Payment</span><span className="font-medium capitalize">{order.paymentMethod || 'cash'}</span>
          </div>
          {order.cashGiven > 0 && order.cashGiven >= order.total && (
            <div className="flex justify-between text-sm font-semibold text-green-600">
              <span>Change</span><span className="tabular-nums">{fmt(order.cashGiven - order.total)}</span>
            </div>
          )}
          {order.offline && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-700 text-center">
              ⚠️ Offline sale — will sync when connection restores
            </div>
          )}
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button onClick={() => window.print()} className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl py-3 text-sm font-semibold transition-colors">
            <Printer className="w-4 h-4" /> Print
          </button>
          <button onClick={onClose} className="flex-1 flex items-center justify-center gap-2 text-white rounded-xl py-3 text-sm font-semibold transition-colors" style={{ background: 'var(--az-accent)' }}>
            <CheckCircle2 className="w-4 h-4" /> Done
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function PaymentModal({ total, onClose, onConfirm, isLoading }) {
  const [method, setMethod] = useState('CASH');
  const [cashInput, setCashInput] = useState('');
  const [azmInput, setAzmInput] = useState('');
  const cashAmt = parseFloat(cashInput) || 0;
  const azmAmt = method === 'SPLIT' ? (parseFloat(azmInput) || 0) : (method === 'AZM' ? total : 0);
  const cashRequired = method === 'SPLIT' ? Math.max(0, total - azmAmt) : total;
  const change = (method === 'CASH' || method === 'SPLIT') ? Math.max(0, cashAmt - cashRequired) : 0;
  const canConfirm = method === 'AZM' || (method === 'CASH' && cashAmt >= total) || (method === 'SPLIT' && (cashAmt + azmAmt) >= total);
  const METHODS = [
    { id: 'CASH', label: 'Cash', icon: Banknote },
    { id: 'AZM', label: 'AZM Balance', icon: CreditCard },
    { id: 'SPLIT', label: 'Split', icon: SplitSquareHorizontal },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        style={{ background: 'var(--az-bg-alt)', borderColor: 'var(--az-border)' }}
        className="border rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b" style={{ borderColor: 'var(--az-border)' }}>
          <h3 className="font-bold text-lg" style={{ color: 'var(--az-text)' }}>Payment</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--az-text-muted)' }}><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="text-center">
            <div className="text-sm mb-1" style={{ color: 'var(--az-text-muted)' }}>Amount Due</div>
            <div className="text-4xl font-bold tabular-nums" style={{ color: 'var(--az-text)' }}>{fmt(total)}</div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {METHODS.map(m => (
              <button key={m.id} onClick={() => setMethod(m.id)}
                className={cn('flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-semibold transition-all', method === m.id ? 'border-current' : 'border-gray-200 text-gray-400 hover:border-gray-300')}
                style={method === m.id ? { borderColor: 'var(--az-accent)', color: 'var(--az-accent)', background: 'var(--az-accent-subtle)' } : {}}>
                <m.icon className="w-5 h-5" />{m.label}
              </button>
            ))}
          </div>
          {(method === 'CASH' || method === 'SPLIT') && (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--az-text-muted)' }}>{method === 'SPLIT' ? 'Cash Amount' : 'Cash Given'}</label>
              <input type="number" value={cashInput} onChange={e => setCashInput(e.target.value)} placeholder={cashRequired.toFixed(2)}
                className="w-full bg-white border rounded-xl px-4 py-3 text-lg font-bold tabular-nums focus:outline-none" style={{ borderColor: 'var(--az-border)', color: 'var(--az-text)' }} />
              {change > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm flex justify-between">
                  <span className="text-green-700">Change</span><span className="font-bold text-green-700 tabular-nums">{fmt(change)}</span>
                </div>
              )}
            </div>
          )}
          {method === 'SPLIT' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--az-text-muted)' }}>AZM Amount</label>
              <input type="number" value={azmInput} onChange={e => setAzmInput(e.target.value)} placeholder="0.00"
                className="w-full bg-white border rounded-xl px-4 py-3 text-lg font-bold tabular-nums focus:outline-none" style={{ borderColor: 'var(--az-border)', color: 'var(--az-text)' }} />
            </div>
          )}
          <button onClick={() => onConfirm({ method, cashGiven: cashAmt, azmAmount: azmAmt })} disabled={!canConfirm || isLoading}
            className="w-full py-4 text-white font-bold rounded-xl text-base transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm disabled:opacity-40"
            style={{ background: 'var(--az-accent)' }}>
            {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            Confirm Payment
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function POS() {
  const { bizProfile } = useAuth();
  const { hasPermission } = usePermission();
  const qc = useQueryClient();
  const online = useOnlineStatus();
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQ, setSearchQ] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);
  const [outboxCount, setOutboxCount] = useState(readOutbox().length);
  const [syncing, setSyncing] = useState(false);
  const canRing = hasPermission('orders.create') || hasPermission('dinein.manage');
  const refreshOutbox = useCallback(() => setOutboxCount(readOutbox().length), []);

  const { data: productsData = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['pos-products'],
    queryFn: () => productsApi.list({ limit: 200 }),
    select: d => Array.isArray(d) ? d : (d?.products || d?.data || []),
    staleTime: 5 * 60_000,
  });

  const categories = ['all', ...Array.from(new Set(productsData.map(p => (p.category || 'Other').toLowerCase())))];

  const visibleProducts = productsData.filter(p => {
    const inCat = activeCategory === 'all' || (p.category || 'Other').toLowerCase() === activeCategory;
    const inSearch = !searchQ || p.name?.toLowerCase().includes(searchQ.toLowerCase());
    return inCat && inSearch && p.isAvailable !== false;
  });

  const addToCart = (product) => setCart(prev => {
    const existing = prev.find(i => i.id === product.id);
    if (existing) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
    return [...prev, { id: product.id, name: product.name, price: Number(product.price || 0), qty: 1, imageUrl: product.imageUrl }];
  });

  const updateQty = (id, delta) => setCart(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter(i => i.qty > 0));
  const clearCart = () => setCart([]);

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = subtotal * 0.025;
  const total = subtotal + tax;

  const placeOrderMutation = useMutation({
    mutationFn: async ({ method, cashGiven, azmAmount }) => {
      const payload = {
        items: cart.map(i => ({ productId: i.id, qty: i.qty })),
        paymentMethod: method,
        cashGiven: method !== 'AZM' ? cashGiven : undefined,
        azmAmount: method !== 'CASH' ? azmAmount : undefined,
        idempotencyKey: crypto.randomUUID(), source: 'POS',
      };
      if (!online) {
        enqueue({ type: 'CREATE_ORDER', payload });
        refreshOutbox();
        return { offline: true };
      }
      return request('/api/business-os/pos/order', { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: (data, vars) => {
      setCompletedOrder({ items: cart, total, paymentMethod: vars.method, cashGiven: vars.cashGiven, offline: data?.offline || false });
      clearCart(); setShowPayment(false);
      qc.invalidateQueries({ queryKey: ['orders'] });
      if (!data?.offline) toast.success('Order placed!');
    },
    onError: (err) => toast.error('Order failed: ' + err.message),
  });

  useEffect(() => {
    if (!online || outboxCount === 0) return;
    const syncOutbox = async () => {
      setSyncing(true);
      const box = readOutbox(); const remaining = [];
      let synced = 0;
      for (const item of box) {
        if (item.type === 'CREATE_ORDER') {
          try {
            await request('/api/business-os/pos/order', { method: 'POST', body: JSON.stringify(item.payload) });
            synced++;
          } catch (e) {
            const retries = (item.retryCount || 0) + 1;
            if (retries < 3) remaining.push({ ...item, status: 'FAILED', retryCount: retries });
            // After 3 retries, drop the item to avoid infinite loop
          }
        }
      }
      writeOutbox(remaining); refreshOutbox(); setSyncing(false);
      if (synced > 0) { toast.success(`${synced} offline order(s) synced!`); qc.invalidateQueries({ queryKey: ['orders'] }); }
      if (remaining.length > 0) toast.warning(`${remaining.length} order(s) failed to sync — will retry.`);
    };
    syncOutbox();
  }, [online, outboxCount]);

  return (
    <div className="flex overflow-hidden" style={{ height: 'calc(100vh - 4rem)', background: 'var(--az-bg)' }}>
      {/* Product Grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: 'var(--az-border)', background: 'var(--az-bg-alt)' }}>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--az-text-muted)' }} />
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search items…"
              className="w-full pl-9 pr-4 py-2.5 bg-white border rounded-xl text-sm focus:outline-none"
              style={{ borderColor: 'var(--az-border)', color: 'var(--az-text)' }} />
            {searchQ && <button onClick={() => setSearchQ('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--az-text-muted)' }}><X className="w-3.5 h-3.5" /></button>}
          </div>
          <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border', online ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200')}>
            {online ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {online ? (syncing ? 'Syncing…' : 'Online') : 'Offline'}
          </div>
          {outboxCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <Clock className="w-3.5 h-3.5" />{outboxCount} queued
            </div>
          )}
        </div>

        {/* Categories */}
        <div className="flex items-center gap-1.5 px-5 py-3 overflow-x-auto no-scrollbar border-b" style={{ borderColor: 'var(--az-border)', background: 'var(--az-bg-alt)' }}>
          {categories.map(cat => {
            const Icon = CAT_ICONS[cat] || Tag;
            const isActive = activeCategory === cat;
            return (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all border"
                style={isActive ? { background: 'var(--az-accent)', color: '#fff', borderColor: 'var(--az-accent)' } : { background: 'white', color: 'var(--az-text-muted)', borderColor: 'var(--az-border)' }}>
                <Icon className="w-3.5 h-3.5" />
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            );
          })}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {loadingProducts ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] rounded-2xl animate-pulse" style={{ background: 'var(--az-border)' }} />
              ))}
            </div>
          ) : visibleProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: 'var(--az-text-muted)' }}>
              <Package className="w-12 h-12 opacity-30" /><p className="text-sm">No items found</p>
            </div>
          ) : (
            <motion.div variants={{ show: { transition: { staggerChildren: 0.03 } } }} initial="hidden" animate="show"
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {visibleProducts.map(product => {
                const cartItem = cart.find(i => i.id === product.id);
                return (
                  <motion.button key={product.id}
                    variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                    onClick={() => addToCart(product)}
                    className="group relative flex flex-col bg-white border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all active:scale-[0.97] text-left"
                    style={{ borderColor: 'var(--az-border)' }}>
                    <div className="aspect-square relative overflow-hidden" style={{ background: 'var(--az-bg)' }}>
                      {product.imageUrl
                        ? <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        : <div className="w-full h-full flex items-center justify-center"><Package className="w-10 h-10 opacity-20" style={{ color: 'var(--az-text-muted)' }} /></div>
                      }
                      {cartItem && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center shadow-md" style={{ background: 'var(--az-accent)' }}>
                          {cartItem.qty}
                        </div>
                      )}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center" style={{ background: 'rgba(108,79,209,0.08)' }}>
                        <Plus className="w-7 h-7 drop-shadow" style={{ color: 'var(--az-accent)' }} />
                      </div>
                    </div>
                    <div className="p-3 flex-1 flex flex-col">
                      <span className="text-sm font-semibold line-clamp-2" style={{ color: 'var(--az-text)' }}>{product.name}</span>
                      <div className="mt-auto pt-2 flex items-center justify-between">
                        <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--az-accent)' }}>{fmt(product.price)}</span>
                        {product.stockQuantity != null && product.stockQuantity < 5 && (
                          <span className="text-xs font-medium" style={{ color: 'var(--az-danger)' }}>{product.stockQuantity} left</span>
                        )}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>

      {/* Cart Panel */}
      <div className="w-80 xl:w-96 flex flex-col border-l" style={{ borderColor: 'var(--az-border)', background: 'var(--az-bg-alt)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--az-border)' }}>
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" style={{ color: 'var(--az-accent)' }} />
            <h2 className="font-bold" style={{ color: 'var(--az-text)' }}>Cart</h2>
            {cart.length > 0 && (
              <span className="text-xs font-bold text-white px-2 py-0.5 rounded-full" style={{ background: 'var(--az-accent)' }}>
                {cart.reduce((s, i) => s + i.qty, 0)}
              </span>
            )}
          </div>
          {cart.length > 0 && (
            <button onClick={clearCart} className="text-xs font-semibold flex items-center gap-1 px-2 py-1 rounded-lg transition-colors"
              style={{ color: 'var(--az-danger)' }}>
              <Trash2 className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <AnimatePresence>
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: 'var(--az-text-muted)' }}>
                <ShoppingCart className="w-12 h-12 opacity-20" />
                <p className="text-sm text-center">Tap items on the left<br/>to add them here</p>
              </div>
            ) : cart.map(item => (
              <motion.div key={item.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="flex items-center gap-3 bg-white border rounded-xl p-3" style={{ borderColor: 'var(--az-border)' }}>
                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0" style={{ background: 'var(--az-bg)' }}>
                  {item.imageUrl
                    ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><Package className="w-4 h-4 opacity-30" /></div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--az-text)' }}>{item.name}</p>
                  <p className="text-xs tabular-nums" style={{ color: 'var(--az-text-muted)' }}>{fmt(item.price)}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 rounded-lg border flex items-center justify-center transition-colors hover:bg-red-50 hover:border-red-200"
                    style={{ background: 'var(--az-bg)', borderColor: 'var(--az-border)', color: 'var(--az-text-secondary)' }}>
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-7 text-center text-sm font-bold tabular-nums" style={{ color: 'var(--az-text)' }}>{item.qty}</span>
                  <button onClick={() => updateQty(item.id, 1)} className="w-7 h-7 rounded-lg border flex items-center justify-center transition-colors"
                    style={{ background: 'var(--az-bg)', borderColor: 'var(--az-border)', color: 'var(--az-text-secondary)' }}>
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <span className="text-sm font-bold tabular-nums w-16 text-right" style={{ color: 'var(--az-text)' }}>{fmt(item.price * item.qty)}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {cart.length > 0 && (
          <div className="p-5 border-t bg-white space-y-3" style={{ borderColor: 'var(--az-border)' }}>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between" style={{ color: 'var(--az-text-secondary)' }}>
                <span>Subtotal</span><span className="tabular-nums">{fmt(subtotal)}</span>
              </div>
              <div className="flex justify-between" style={{ color: 'var(--az-text-secondary)' }}>
                <span>Tax (2.5%)</span><span className="tabular-nums">{fmt(tax)}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-1 border-t mt-1" style={{ borderColor: 'var(--az-border)', color: 'var(--az-text)' }}>
                <span>Total</span><span className="tabular-nums" style={{ color: 'var(--az-accent)' }}>{fmt(total)}</span>
              </div>
            </div>
            <button onClick={() => setShowPayment(true)} disabled={!canRing}
              className="w-full py-4 text-white font-bold rounded-xl text-base transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm disabled:opacity-40"
              style={{ background: 'var(--az-accent)' }}>
              <Zap className="w-5 h-5" /> Charge {fmt(total)}
            </button>
            {!online && (
              <p className="text-xs text-center flex items-center justify-center gap-1 text-amber-600">
                <WifiOff className="w-3 h-3" /> Order will be queued offline
              </p>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showPayment && (
          <PaymentModal total={total} onClose={() => setShowPayment(false)}
            onConfirm={(payData) => placeOrderMutation.mutate(payData)} isLoading={placeOrderMutation.isPending} />
        )}
        {completedOrder && (
          <ReceiptModal order={completedOrder} bizName={bizProfile?.businessName} onClose={() => setCompletedOrder(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
