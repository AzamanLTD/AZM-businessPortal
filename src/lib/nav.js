/**
 * NAV — the SINGLE source of truth for navigation.
 * Delete ALL_NAVIGATION_ITEMS from Layout.jsx and the parallel navItems arrays
 * in businessTypes.js.
 */

import {
  LayoutDashboard, CalendarCheck, ConciergeBell, ChefHat, BedDouble, Sparkles,
  Bus, Route, Users, Package, Wallet, Receipt, LineChart, Megaphone, Store,
  Star, Settings, Building2, MessageSquare, Bell, ClipboardList, Boxes,
  UserCog, CalendarClock, Banknote, Plane, WandSparkles,
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
        { to:'/hotel-front-desk',   label:'Front Desk',    icon:ConciergeBell, count:'arrivalsToday', perm:'hotel.front_desk.manage' },
        { to:'/checkin',            label:'Check-in',      icon:ClipboardList, ownerOnly:true },
        { to:'/hotel-housekeeping', label:'Housekeeping',  icon:Sparkles, count:'roomsDirty', perm:'hotel.housekeeping.manage' },
      ]},
      { label:'Front line', vertical:['RESTAURANT'], items:[
        { to:'/restaurant-kitchen', label:'Kitchen Display', icon:ChefHat, count:'ticketsOpen', perm:'restaurant.kitchen.view' },
        { to:'/restaurant-tables',  label:'Floor Plan',      icon:ClipboardList, perm:'restaurant.tables.manage' },
        { to:'/pos',                label:'Point of Sale',   icon:Store, perm:'orders.manage' },
      ]},
      { label:'Front line', vertical:['TRANSIT'], items:[
        { to:'/transit-fleet',   label:'Fleet',     icon:Bus, perm:'transit.fleet.view' },
        { to:'/transit',         label:'Trips',     icon:Route, count:'tripsToday', perm:'transit.trips.view' },
        { to:'/transit-drivers', label:'Drivers',   icon:UserCog, perm:'transit.drivers.manage' },
        { to:'/transit-cargo',   label:'Cargo',     icon:Package, perm:'transit.cargo.view' },
      ]},
    ],
  },
  {
    id:'bookings', label:'Bookings', icon:CalendarCheck, verticals:null,
    groups:[
      { label:'Demand', items:[
        { to:'/reservations', label:'Reservations', icon:CalendarCheck, count:'reservationsPending', ownerOnly:true },
        { to:'/orders',       label:'Orders',       icon:Receipt, count:'ordersOpen', ownerOnly:true },
        { to:'/invoices',     label:'Invoices',     icon:Receipt, ownerOnly:true },
      ]},
      { label:'Inventory', items:[
        { to:'/hotel-rooms',           label:'Rooms',    icon:BedDouble, vertical:['HOTEL'], perm:'hotel.rooms.view' },
        { to:'/restaurant-inventory',  label:'Stock',    icon:Boxes, vertical:['RESTAURANT','HOTEL'], perm:'restaurant.inventory.view' },
        { to:'/retail-inventory',      label:'Products', icon:Package, perm:'retail.view' },
        { to:'/dine-in',               label:'Dine-in',  icon:ChefHat, vertical:['RESTAURANT','HOTEL'], perm:'restaurant.dinein.manage' },
      ]},
      { label:'Guests', items:[
        { to:'/guests',  label:'Guest book', icon:Users, perm:'restaurant.dinein.manage' },
        { to:'/reviews', label:'Reviews',    icon:Star, ownerOnly:true },
      ]},
    ],
  },
  {
    id:'money', label:'Money', icon:Wallet, verticals:null,
    groups:[
      { label:'Position', items:[
        { to:'/finance',           label:'Overview',  icon:Wallet, perm:'finance.view' },
        { to:'/finance/pnl',       label:'P&L',       icon:LineChart, perm:'finance.view' },
        { to:'/finance/expenses',  label:'Expenses',  icon:Receipt, perm:'finance.view' },
      ]},
      { label:'Settlement', items:[
        { to:'/finance/payouts',   label:'Payouts',   icon:Banknote, count:'payoutsPending', perm:'finance.view' },
        { to:'/finance/disputes',  label:'Disputes',  icon:Receipt, count:'disputes', perm:'finance.view' },
      ]},
    ],
  },
  {
    id:'people', label:'People', icon:Users, verticals:null,
    groups:[
      { label:'Workforce', items:[
        { to:'/employees',  label:'Employees',  icon:Users, perm:'employees.view' },
        { to:'/scheduling', label:'Scheduling', icon:CalendarClock, perm:'shifts.view' },
        { to:'/payroll',    label:'Payroll',    icon:Banknote, perm:'payroll.view' },
        { to:'/time-off',   label:'Time off',   icon:Plane, count:'timeOffPending', perm:'shifts.view' },
      ]},
    ],
  },
  {
    id:'growth', label:'Growth', icon:Megaphone, verticals:null,
    groups:[
      { label:'Storefront', items:[
        { to:'/storefront',           label:'Editor',    icon:Store, ownerOnly:true },
        { to:'/storefront/experience', label:'Experience Studio', icon:WandSparkles, ownerOnly:true },
        { to:'/storefront/analytics', label:'Traffic',   icon:LineChart, ownerOnly:true },
        { to:'/marketing/web-ordering', label:'Web ordering', icon:Store, perm:'marketing.view' },
      ]},
      { label:'Reach', items:[
        { to:'/marketing', label:'Campaigns', icon:Megaphone, perm:'marketing.view' },
        { to:'/analytics', label:'Analytics', icon:LineChart, perm:'analytics.view' },
        { to:'/showcase',  label:'Showcase',  icon:Star, perm:'marketing.view' },
      ]},
    ],
  },
  {
    id:'setup', label:'Setup', icon:Settings, verticals:null,
    groups:[
      { label:'Business', items:[
        { to:'/settings',           label:'Profile & brand', icon:Settings },
        { to:'/locations',          label:'Locations',       icon:Building2, ownerOnly:true },
        { to:'/groups',             label:'Business groups', icon:Building2 },
      ]},
      { label:'Platform', items:[
        { to:'/settings/messaging', label:'Messaging',  icon:MessageSquare },
        { to:'/settings/developer', label:'Developer',  icon:Settings },
        { to:'/kyb',                label:'Verification', icon:ClipboardList, count:'kybAction', ownerOnly:true },
      ]},
    ],
  },
];

/** Single gating function. Layout must not re-derive vertical booleans. */
export function resolveNav({ businessType, hasPermission, isOwner, counts = {} }) {
  // Nav visibility mirrors the backend contract: `perm` is the exact key
  // requirePermission() enforces on that surface; `ownerOnly` marks surfaces
  // the backend scopes by business ownership. Hiding nav is UX only — the
  // server enforces either way.
  const allow = n =>
    (!n.vertical || n.vertical.includes(businessType)) &&
    (n.ownerOnly ? isOwner : true) &&
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
