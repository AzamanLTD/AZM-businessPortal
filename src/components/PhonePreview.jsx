import { useEffect, useState, useRef } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { X, Battery, Wifi, Signal, Star, MapPin, Clock, ChevronRight, Search, Bus, UtensilsCrossed, BedDouble, ShoppingBag, Smartphone, Minus, Move } from 'lucide-react';
import { getTypeConfig } from '@/lib/businessTypes';

// ── iPhone 17 Pro Max dimensions (Apple's official CSS px) ──
const SCREEN_W = 393;
const SCREEN_H = 852;
const BEZEL = 12;
const CORNER_R = 47; // Apple's official screen corner radius

// Total frame dimensions
const FRAME_W = SCREEN_W + BEZEL * 2;
const FRAME_H = SCREEN_H + BEZEL * 2;
const FRAME_CORNER = CORNER_R + BEZEL;

// Floating widget scale — shrinks the full iPhone frame down to a small
// movable card that sits alongside the portal instead of covering it.
const WIDGET_SCALE = 0.5;

export function PhonePreview({ business, onClose }) {
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  );
  const [minimized, setMinimized] = useState(false);
  const dragControls = useDragControls();
  const constraintsRef = useRef(null);

  useEffect(() => {
    const id = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }));
    }, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!business) return null;
  const typeConfig = getTypeConfig(business);

  // Invisible full-viewport bounds so the widget can be dragged anywhere
  // on screen but never off it. It does NOT intercept clicks — the portal
  // underneath stays fully usable while the preview floats on top.
  return (
    <div ref={constraintsRef} className="fixed inset-0 z-[100] pointer-events-none">
      {minimized ? (
        <motion.button
          drag
          dragControls={dragControls}
          dragMomentum={false}
          dragConstraints={constraintsRef}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.6 }}
          onClick={() => setMinimized(false)}
          className="pointer-events-auto absolute bottom-8 right-8 w-14 h-14 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing shadow-sn-tooltip"
          style={{ background: 'var(--az-accent)', touchAction: 'none' }}
          title="Show live preview"
        >
          <Smartphone className="w-6 h-6 text-[var(--az-text)]" />
        </motion.button>
      ) : (
        <motion.div
          drag
          dragListener={false}
          dragControls={dragControls}
          dragMomentum={false}
          dragConstraints={constraintsRef}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="pointer-events-auto absolute bottom-8 right-8 flex flex-col items-center"
        >
          {/* Drag handle / title bar */}
          <div
            onPointerDown={(e) => dragControls.start(e)}
            className="w-full mb-2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--az-card)] border border-[var(--az-border-strong)] shadow-sn-tooltip cursor-grab active:cursor-grabbing select-none"
            style={{ touchAction: 'none' }}
          >
            <Move className="w-3 h-3 text-[var(--az-text-muted)] flex-shrink-0" />
            <p className="text-[11px] font-medium text-[var(--az-text-muted)] truncate flex-1">
              Live Preview: <span className="font-bold text-[var(--az-text)]">{business.businessName}</span>
            </p>
            <button
              onClick={() => setMinimized(true)}
              className="w-5 h-5 rounded-full flex items-center justify-center text-[var(--az-text-muted)] hover:text-[var(--az-text)] hover:bg-[var(--az-bg-alt)] flex-shrink-0"
              aria-label="Minimize preview"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              onClick={onClose}
              className="w-5 h-5 rounded-full flex items-center justify-center text-[var(--az-text-muted)] hover:text-[var(--az-text)] hover:bg-[var(--az-bg-alt)] flex-shrink-0"
              aria-label="Close preview"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

        {/* ── iPHONE 17 PRO MAX — SVG-MASKED FRAME (scaled down as a floating widget) ── */}
        <div
          className="relative rounded-[46px]"
          style={{
            width: FRAME_W,
            height: FRAME_H,
            transform: `scale(${WIDGET_SCALE})`,
            transformOrigin: 'top center',
            marginBottom: -FRAME_H * (1 - WIDGET_SCALE),
            background: 'linear-gradient(135deg, #3a3a3c 0%, #1c1c1e 25%, #2c2c2e 50%, #1c1c1e 75%, #3a3a3c 100%)',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.15), 0 20px 40px -10px rgba(0,0,0,0.5), 0 40px 100px -20px rgba(0,0,0,0.8)',
            padding: BEZEL,
          }}
        >
          {/* Titanium edge highlight — inset gradient ring */}
          <div
            className="absolute inset-0 rounded-[46px] pointer-events-none"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 5%, transparent 95%, rgba(255,255,255,0.08) 100%)',
            }}
          />

          {/* Hardware buttons — left side (volume up, volume down, action button) */}
          <div className="absolute top-[100px] -left-[2px] w-[3px] h-[40px] bg-gradient-to-b from-[#3a3a3c] to-[#1c1c1e] rounded-l-sm shadow-sm" />
          <div className="absolute top-[155px] -left-[2px] w-[3px] h-[55px] bg-gradient-to-b from-[#3a3a3c] to-[#1c1c1e] rounded-l-sm shadow-sm" />
          <div className="absolute top-[220px] -left-[2px] w-[3px] h-[55px] bg-gradient-to-b from-[#3a3a3c] to-[#1c1c1e] rounded-l-sm shadow-sm" />
          {/* Right side — power button */}
          <div className="absolute top-[175px] -right-[2px] w-[3px] h-[80px] bg-gradient-to-b from-[#3a3a3c] to-[#1c1c1e] rounded-r-sm shadow-sm" />

          {/* ── Screen — SVG mask for perfect corner radius ── */}
          <div
            className="relative overflow-hidden bg-black"
            style={{
              width: SCREEN_W,
              height: SCREEN_H,
              borderRadius: CORNER_R,
            }}
          >
            {/* Screen content wrapper */}
            <div className="absolute inset-0 bg-[#F2F2F7] overflow-hidden">
              {/* iOS status bar */}
              <div className="absolute top-0 w-full h-[54px] z-50 flex justify-between items-end px-7 pb-2.5 text-black">
                <span className="text-[15px] font-semibold tracking-tight w-[54px] text-center ml-1">
                  {currentTime}
                </span>
                <div className="flex items-center gap-1.5 mr-1">
                  <Signal className="w-4 h-4 fill-current" />
                  <Wifi className="w-4 h-4" />
                  <Battery className="w-6 h-6 -mr-1.5" />
                </div>
              </div>

              {/* Dynamic Island */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[120px] h-[35px] bg-black rounded-full z-50 flex items-center justify-end px-2.5">
                {/* Camera lens */}
                <div className="w-[11px] h-[11px] rounded-full bg-[#0a0a0a] border border-white/5 flex items-center justify-center">
                  <div className="w-[4px] h-[4px] rounded-full bg-[var(--az-info)] blur-[1px]" />
                </div>
              </div>

              {/* App content */}
              <div className="w-full h-full pt-[54px] overflow-y-auto no-scrollbar">
                <ScreenForType typeConfig={typeConfig} business={business} />
              </div>

              {/* iOS home indicator */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[134px] h-[5px] bg-black/80 rounded-full z-50" />
            </div>

            {/* Glass glare overlay — subtle reflection */}
            <div
              className="absolute inset-0 rounded-[47px] pointer-events-none z-[60]"
              style={{
                background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.04) 50%, transparent 60%)',
              }}
            />
          </div>
        </div>
      </motion.div>
      )}
    </div>
  );
}

function ScreenForType({ typeConfig, business }) {
  switch (typeConfig.type) {
    case 'RESTAURANT': return <RestaurantScreen typeConfig={typeConfig} business={business} />;
    case 'HOTEL':      return <HotelScreen typeConfig={typeConfig} business={business} />;
    case 'TRANSIT':    return <TransitScreen typeConfig={typeConfig} business={business} />;
    default:           return <RetailScreen typeConfig={typeConfig} business={business} />;
  }
}

function HeaderBlock({ typeConfig, business, subtitle }) {
  return (
    <div className="w-full px-4 pt-3 pb-4 bg-[var(--az-surface-1)] border-b border-black/5">
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm"
          style={{ backgroundColor: `${typeConfig.color}18`, color: typeConfig.color }}
        >
          <span className="font-bold text-lg">{business.businessName?.charAt(0) || 'A'}</span>
        </div>
        <div className="min-w-0">
          <h2 className="text-[16px] font-bold text-gray-900 truncate">{business.businessName}</h2>
          <p className="text-[13px] text-gray-500 font-medium">{subtitle || typeConfig.label}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 mt-2 text-[12px] text-gray-500">
        <Star className="w-3.5 h-3.5 fill-amber-400 text-[var(--az-warning)]" />
        <span className="font-semibold text-gray-700">4.8</span>
        <span>· 210 reviews</span>
      </div>
    </div>
  );
}

function RestaurantScreen({ typeConfig, business }) {
  return (
    <div className="pb-8">
      <HeaderBlock typeConfig={typeConfig} business={business} subtitle="Restaurant · Open now" />
      <div className="px-4 py-3 flex gap-2">
        {['Reserve a table', 'Order dine-in', 'Menu'].map((label, i) => (
          <div key={label} className={`flex-1 rounded-xl py-2.5 text-center text-[12px] font-semibold ${i === 0 ? 'text-[var(--az-text)]' : 'bg-[var(--az-surface-1)] border border-black/5 text-gray-700'}`}
               style={i === 0 ? { backgroundColor: typeConfig.color } : {}}>
            {label}
          </div>
        ))}
      </div>
      <div className="px-4 mt-2">
        <p className="text-[13px] font-bold text-gray-800 mb-2">Popular dishes</p>
        <div className="grid grid-cols-2 gap-3">
          {['Jollof Special', 'Grilled Tilapia', 'Waakye Bowl', 'Banku & Okro'].map((dish) => (
            <div key={dish} className="bg-[var(--az-surface-1)] rounded-2xl border border-black/5 shadow-sm overflow-hidden">
              <div className="h-24 bg-gradient-to-br from-gray-100 to-gray-200" />
              <div className="p-2.5">
                <p className="text-[12px] font-semibold text-gray-800 truncate">{dish}</p>
                <p className="text-[12px] text-gray-500 mt-0.5">GHS 45.00</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HotelScreen({ typeConfig, business }) {
  return (
    <div className="pb-8">
      <HeaderBlock typeConfig={typeConfig} business={business} subtitle="Hotel · 4 room types" />
      <div className="px-4 mt-3 space-y-3">
        {['Deluxe Room', 'Executive Suite', 'Standard Twin'].map((room, i) => (
          <div key={room} className="bg-[var(--az-surface-1)] rounded-2xl border border-black/5 shadow-sm flex overflow-hidden">
            <div className="w-28 h-24 bg-gradient-to-br from-gray-100 to-gray-200 flex-shrink-0" />
            <div className="p-3 flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-gray-800 truncate">{room}</p>
              <p className="text-[12px] text-gray-500 mt-0.5">GHS {180 + i * 60}/night</p>
              <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                   style={{ backgroundColor: `${typeConfig.color}18`, color: typeConfig.color }}>
                <BedDouble className="w-3 h-3" /> Available
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TransitScreen({ typeConfig, business }) {
  return (
    <div className="pb-8">
      <HeaderBlock typeConfig={typeConfig} business={business} subtitle="Transit · Next departure 20 min" />
      <div className="px-4 mt-3 space-y-2.5">
        {[
          { from: 'Accra', to: 'Kumasi', time: '8:30 AM' },
          { from: 'Accra', to: 'Takoradi', time: '11:00 AM' },
          { from: 'Accra', to: 'Cape Coast', time: '2:15 PM' },
        ].map((trip) => (
          <div key={trip.time} className="bg-[var(--az-surface-1)] rounded-2xl border border-black/5 shadow-sm p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ backgroundColor: `${typeConfig.color}18`, color: typeConfig.color }}>
              <Bus className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-gray-800">{trip.from} → {trip.to}</p>
              <p className="text-[12px] text-gray-500 flex items-center gap-1 mt-0.5">
                <Clock className="w-3.5 h-3.5" /> {trip.time}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300" />
          </div>
        ))}
      </div>
    </div>
  );
}

function RetailScreen({ typeConfig, business }) {
  return (
    <div className="pb-8">
      <HeaderBlock typeConfig={typeConfig} business={business} subtitle="Store · Ships same day" />
      <div className="px-4 py-3">
        <div className="bg-[var(--az-surface-1)] rounded-xl border border-black/5 flex items-center gap-2 px-3 py-2.5">
          <Search className="w-4 h-4 text-gray-400" />
          <span className="text-[13px] text-gray-400">Search products</span>
        </div>
      </div>
      <div className="px-4">
        <div className="grid grid-cols-2 gap-3">
          {['Product A', 'Product B', 'Product C', 'Product D'].map((p) => (
            <div key={p} className="bg-[var(--az-surface-1)] rounded-2xl border border-black/5 shadow-sm overflow-hidden">
              <div className="h-28 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <ShoppingBag className="w-7 h-7 text-gray-300" />
              </div>
              <div className="p-3">
                <p className="text-[12px] font-semibold text-gray-800 truncate">{p}</p>
                <p className="text-[12px] mt-0.5 font-semibold" style={{ color: typeConfig.color }}>GHS 120.00</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
