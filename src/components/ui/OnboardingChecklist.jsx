/**
 * OnboardingChecklist — persistent dashboard card shown until 100% complete.
 * Checks real data against checklist items, shows progress ring + deep links.
 */
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { business as businessApi, products as productsApi } from '@/lib/api';
import {
  CheckCircle2, Circle, ChevronDown, ChevronUp,
  Store, MapPin, Package, Shield, CreditCard, Users, Clock, X
} from 'lucide-react';

function ProgressRing({ pct, size = 48, stroke = 4 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--f-line)" strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke="var(--f-tint-color)" strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  );
}

const BUSINESS_CHECKLIST = [
  { id: 'profile',   icon: Store,       label: 'Complete business profile',        link: '/settings',   hint: 'Add your logo, description, and contact info' },
  { id: 'location',  icon: MapPin,       label: 'Add your first location',          link: '/locations',  hint: 'Customers need to find you' },
  { id: 'product',   icon: Package,      label: 'Add a product, room, or vehicle',  link: '/products',   hint: 'Start your catalog' },
  { id: 'kyb',       icon: Shield,       label: 'Submit KYB verification',          link: '/kyb',        hint: 'Required for payouts' },
  { id: 'payout',    icon: CreditCard,   label: 'Set up payout destination',        link: '/settings',   hint: 'Connect MoMo or bank' },
  { id: 'employee',  icon: Users,        label: 'Invite your first employee',       link: '/employees',  hint: 'Give your team portal access' },
  { id: 'hours',     icon: Clock,        label: 'Configure availability hours',     link: '/locations',  hint: 'Let customers know when you are open' },
];

const HOTEL_EXTRA   = [{ id: 'room',    icon: Package, label: 'Add your first room type',     link: '/hotel-rooms',          hint: 'Define room categories and pricing' }];
const REST_EXTRA    = [{ id: 'menu',    icon: Package, label: 'Build your first menu section', link: '/products',             hint: 'Create categories and add dishes' }];
const TRANSIT_EXTRA = [{ id: 'vehicle', icon: Package, label: 'Add your first vehicle',       link: '/transit-fleet',        hint: 'Add your fleet to start routing' }];

export default function OnboardingChecklist() {
  const { bizProfile } = useAuth();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('az-checklist-dismissed') === '1');
  const [expanded, setExpanded]   = useState(true);

  const { data: profileData } = useQuery({ queryKey: ['checklist-profile'], queryFn: businessApi.me, enabled: !!bizProfile });
  const { data: productsData } = useQuery({ queryKey: ['checklist-products'], queryFn: () => productsApi.list({ limit: 1 }), enabled: !!bizProfile });

  if (dismissed || !bizProfile) return null;

  const category = bizProfile?.category || '';
  const extraItems =
    category === 'REAL_ESTATE'   ? HOTEL_EXTRA   :
    category === 'FOOD_BEVERAGE' ? REST_EXTRA    :
    category === 'LOGISTICS'     ? TRANSIT_EXTRA : [];

  const allItems = [...BUSINESS_CHECKLIST, ...extraItems];

  const profile = profileData?.business || profileData || {};
  const productList = Array.isArray(productsData) ? productsData : (productsData?.products || []);

  const checks = {
    profile:   !!(profile.businessName && profile.description && profile.logoUrl),
    location:  !!(profile.locations?.length > 0 || profile.address),
    product:   productList.length > 0,
    kyb:       ['APPROVED','SUBMITTED'].includes(profile.kybStatus),
    payout:    !!(profile.payoutAccountNumber || profile.walletAddress),
    employee:  !!(profile.employeeCount > 0),
    hours:     !!(profile.businessHours || profile.availabilityRules),
    room:      productList.length > 0,
    menu:      productList.length > 0,
    vehicle:   productList.length > 0,
  };

  const completed = allItems.filter(i => checks[i.id]).length;
  const pct = Math.round((completed / allItems.length) * 100);

  if (pct >= 100) {
    localStorage.setItem('az-checklist-dismissed', '1');
    return null;
  }

  const handleDismiss = () => {
    localStorage.setItem('az-checklist-dismissed', '1');
    setDismissed(true);
  };

  return (
    <GlassPanel className="p-5 mb-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <ProgressRing pct={pct} />
          <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-tint" style={{transform:'rotate(90deg)'}}>
            {pct}%
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-ink">Get set up</h3>
          <p className="text-xs text-ink-3 mt-0.5">{completed}/{allItems.length} steps complete — finish setup to unlock all features</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setExpanded(e => !e)} className="p-1.5 rounded-sm hover:bg-surface-sunken text-ink-3 transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={handleDismiss} className="p-1.5 rounded-sm hover:bg-surface-sunken text-ink-3 transition-colors" title="Dismiss">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1.5 rounded-full bg-line overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'var(--f-tint-color)' }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>

      {/* Items */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-4 space-y-1 overflow-hidden"
          >
            {allItems.map((item, i) => {
              const done = checks[item.id];
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 p-2.5 rounded-sm group hover:bg-surface-sunken transition-colors"
                >
                  {done
                    ? <CheckCircle2 className="w-4 h-4 text-ok flex-shrink-0" />
                    : <Circle className="w-4 h-4 text-ink-3 flex-shrink-0" />
                  }
                  <Icon className={`w-4 h-4 flex-shrink-0 ${done ? 'text-ink-3' : 'text-tint'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium ${done ? 'line-through text-ink-3' : 'text-ink'}`}>{item.label}</p>
                    {!done && <p className="text-[11px] text-ink-3">{item.hint}</p>}
                  </div>
                  {!done && (
                    <Link to={item.link} className="text-[11px] font-semibold text-tint opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      Do this →
                    </Link>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </GlassPanel>
  );
}
