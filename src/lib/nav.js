/**
 * NAV — the SINGLE source of truth for navigation.
 * Delete ALL_NAVIGATION_ITEMS from Layout.jsx and the parallel navItems arrays
 * in businessTypes.js.
 */

import {
  LayoutDashboard, CalendarCheck, ConciergeBell, ChefHat, BedDouble, Sparkles,
  Bus, Route, Users, Package, Wallet, Receipt, LineChart, Megaphone, Store,
  Star, Settings, Building2, MessageSquare, Bell, ClipboardList, Boxes,
  UserCog, CalendarClock, Banknote, Plane,
} from 'lucide-react';

/**
 * A domain is a mode of work, not a feature list.
 * `verticals: null` means "every business type".
 */
export const DOMAINS = [
  {
    id:'today', label:'Today', icon:LayoutDashboard, verticals:null,
    groups:[
      { label:'Overview', items:[
        { to:'/',              label:'Command Center', icon:LayoutDashboard },
        { to:'/notifications', label:'Notifications',  icon:Bell, count:'notifications' },
        { to:'/messages',      label:'Messages',       icon:MessageSquare, count:'unreadMessages' },
      ]},
      { label:'Front line', vertical:['HOTEL'], items:[
        { to:'/hotel-front-desk',   label:'Front Desk',    icon:ConciergeBell, count:'arrivalsToday' },
        { to:'/checkin',            label:'Check-in',      icon:ClipboardList },
        { to:'/hotel-housekeeping', label:'Housekeeping',  icon:Sparkles, count:'roomsDirty' },
      ]},
      { label:'Front line', vertical:['RESTAURANT'], items:[
        { to:'/restaurant-kitchen', label:'Kitchen Display', icon:ChefHat, count:'ticketsOpen' },
        { to:'/restaurant-tables',  label:'Floor Plan',      icon:ClipboardList },
        { to:'/pos',                label:'Point of Sale',   icon:Store },
      ]},
      { label:'Front line', vertical:['TRANSIT'], items:[
        { to:'/transit-fleet',   label:'Fleet',     icon:Bus },
        { to:'/transit',         label:'Trips',     icon:Route, count:'tripsToday' },
        { to:'/transit-drivers', label:'Drivers',   icon:UserCog },
        { to:'/transit-cargo',   label:'Cargo',     icon:Package },
      ]},
    ],
  },
  {
    id:'bookings', label:'Bookings', icon:CalendarCheck, verticals:null,
    groups:[
      { label:'Demand', items:[
        { to:'/reservations', label:'Reservations', icon:CalendarCheck, count:'reservationsPending' },
        { to:'/orders',       label:'Orders',       icon:Receipt, count:'ordersOpen' },
        { to:'/invoices',     label:'Invoices',     icon:Receipt },
      ]},
      { label:'Inventory', items:[
        { to:'/hotel-rooms',           label:'Rooms',    icon:BedDouble, vertical:['HOTEL'] },
        { to:'/restaurant-inventory',  label:'Stock',    icon:Boxes, vertical:['RESTAURANT','HOTEL'] },
        { to:'/retail-inventory',      label:'Products', icon:Package },
        { to:'/dine-in',               label:'Dine-in',  icon:ChefHat, vertical:['RESTAURANT','HOTEL'] },
      ]},
      { label:'Guests', items:[
        { to:'/guests',  label:'Guest book', icon:Users },
        { to:'/reviews', label:'Reviews',    icon:Star },
      ]},
    ],
  },
  {
    id:'money', label:'Money', icon:Wallet, verticals:null,
    groups:[
      { label:'Position', items:[
        { to:'/finance',           label:'Overview',  icon:Wallet },
        { to:'/finance/pnl',       label:'P&L',       icon:LineChart },
        { to:'/finance/expenses',  label:'Expenses',  icon:Receipt },
      ]},
      { label:'Settlement', items:[
        { to:'/finance/payouts',   label:'Payouts',   icon:Banknote, count:'payoutsPending' },
        { to:'/finance/disputes',  label:'Disputes',  icon:Receipt, count:'disputes' },
      ]},
    ],
  },
  {
    id:'people', label:'People', icon:Users, verticals:null, perm:'employees.view',
    groups:[
      { label:'Workforce', items:[
        { to:'/employees',  label:'Employees',  icon:Users },
        { to:'/scheduling', label:'Scheduling', icon:CalendarClock },
        { to:'/payroll',    label:'Payroll',    icon:Banknote },
        { to:'/time-off',   label:'Time off',   icon:Plane, count:'timeOffPending' },
      ]},
    ],
  },
  {
    id:'growth', label:'Growth', icon:Megaphone, verticals:null,
    groups:[
      { label:'Storefront', items:[
        { to:'/storefront',           label:'Editor',    icon:Store },
        { to:'/storefront/analytics', label:'Traffic',   icon:LineChart },
        { to:'/marketing/web-ordering', label:'Web ordering', icon:Store },
      ]},
      { label:'Reach', items:[
        { to:'/marketing', label:'Campaigns', icon:Megaphone },
        { to:'/analytics', label:'Analytics', icon:LineChart },
        { to:'/showcase',  label:'Showcase',  icon:Star },
      ]},
    ],
  },
  {
    id:'setup', label:'Setup', icon:Settings, verticals:null,
    groups:[
      { label:'Business', items:[
        { to:'/settings',           label:'Profile & brand', icon:Settings },
        { to:'/locations',          label:'Locations',       icon:Building2 },
        { to:'/groups',             label:'Business groups', icon:Building2 },
      ]},
      { label:'Platform', items:[
        { to:'/settings/messaging', label:'Messaging',  icon:MessageSquare },
        { to:'/settings/developer', label:'Developer',  icon:Settings },
        { to:'/kyb',                label:'Verification', icon:ClipboardList, count:'kybAction' },
      ]},
    ],
  },
];

/** Single gating function. Layout must not re-derive vertical booleans. */
export function resolveNav({ businessType, hasPermission, isOwner, counts = {} }) {
  const allow = n =>
    (!n.vertical || n.vertical.includes(businessType)) &&
    (!n.perm || isOwner || hasPermission(n.perm));

  return DOMAINS
    .filter(allow)
    .map(d => ({
      ...d,
      groups: d.groups
        .filter(allow)
        .map(g => ({ ...g, items: g.items.filter(allow)
                       .map(i => ({ ...i, badge: i.count ? counts[i.count] : undefined })) }))
        .filter(g => g.items.length),
    }))
    .filter(d => d.groups.length);
}
