/**
 * Business type configuration — drives type-specific dashboards, nav, and widgets.
 * Each business category maps to a "type" that determines which management
 * tools appear in the portal.
 *
 * Sentry tenet: "Disable (and explain), don't hide" — features not relevant
 * to a business type are shown but disabled with a tooltip explaining why.
 */

export const BUSINESS_TYPES = {
  TRANSIT: {
    label: 'Transit & Transport',
    icon: 'Bus',
    color: '#4f8ef7',
    category: 'LOGISTICS',
    navItems: ['transit', 'reservations', 'manifests', 'seatMap', 'fleet', 'drivers', 'retailInventory', 'guests', 'finance'],
    description: 'Manage trips, seat maps, bookings, and passenger check-ins',
  },
  RESTAURANT: {
    label: 'Restaurant',
    icon: 'UtensilsCrossed',
    color: '#f59e0b',
    category: 'FOOD_BEVERAGE',
    navItems: ['reservations', 'dineIn', 'kitchen', 'tables', 'inventory', 'retailInventory', 'employees', 'guests', 'marketing', 'finance'],
    description: 'Manage reservations, table availability, dine-in tabs, and guest check-ins',
  },
  HOTEL: {
    label: 'Hotel',
    icon: 'Building2',
    color: '#a78bfa',
    category: 'REAL_ESTATE',
    navItems: ['reservations', 'checkin', 'frontdesk', 'rooms', 'housekeeping', 'guests', 'marketing', 'finance'],
    description: 'Manage room bookings, showcase gallery, availability, and guest check-ins',
  },
  RETAIL: {
    label: 'Retail',
    icon: 'ShoppingBag',
    color: '#00d97e',
    category: 'RETAIL',
    navItems: ['checkin', 'marketing', 'finance'],
    description: 'Manage products, orders, and customer check-ins',
  },
  SERVICES: {
    label: 'Services',
    icon: 'Briefcase',
    color: '#00b8d9',
    category: 'FREELANCE_SERVICES',
    navItems: ['reservations', 'checkin'],
    description: 'Manage appointments, bookings, and client check-ins',
  },
  GENERAL: {
    label: 'General Business',
    icon: 'Store',
    color: '#7b7b9a',
    category: 'OTHER',
    navItems: ['checkin'],
    description: 'Manage orders, products, and customer engagement',
  },
};

/** Map a business category to a business type */
export function getBusinessType(category) {
  const map = {
    'LOGISTICS': 'TRANSIT',
    'FOOD_BEVERAGE': 'RESTAURANT',
    'REAL_ESTATE': 'HOTEL',
    'HOSPITALITY': 'HOTEL',
    'RETAIL': 'RETAIL',
    'FREELANCE_SERVICES': 'SERVICES',
    'TECHNOLOGY': 'GENERAL',
    'EDUCATION': 'SERVICES',
    'HEALTH_WELLNESS': 'SERVICES',
    'ENTERTAINMENT': 'GENERAL',
    'FINANCIAL_SERVICES': 'GENERAL',
    'OTHER': 'GENERAL',
  };
  return map[category] || 'GENERAL';
}

/** Get the type config for a business profile */
export function getTypeConfig(bizProfile) {
  const type = getBusinessType(bizProfile?.category);
  return { type, ...BUSINESS_TYPES[type] };
}

/** Check if a business type has a specific feature */
export function hasFeature(bizProfile, feature) {
  const config = getTypeConfig(bizProfile);
  return config.navItems.includes(feature);
}

// ── Nav item definitions ────────────────────────────────────────────────────
export const MARKETPLACE_NAV = {
  transit: { label: 'Transit Trips', icon: 'Bus', to: '/transit' },
  reservations: { label: 'Reservations', icon: 'CalendarCheck', to: '/reservations' },
  checkin: { label: 'Check-In', icon: 'QrCode', to: '/checkin' },
  reviews: { label: 'Reviews', icon: 'Star', to: '/reviews' },
  dineIn: { label: 'Dine-In Tabs', icon: 'Utensils', to: '/dine-in' },
  marketing: { label: 'Marketing', icon: 'Megaphone', to: '/marketing' },
  finance: { label: 'Finance', icon: 'Wallet', to: '/finance' },
  showcase: { label: 'Showcase', icon: 'showcase', to: '/showcase' },
  seatMap: { label: 'Seat Map Editor', icon: 'seatMap', to: '/transit' },
  inventory: { label: 'Inventory', icon: 'Package', to: '/restaurant-inventory' },
  retailInventory: { label: 'Retail Inventory', icon: 'ShoppingCart', to: '/retail-inventory' },
  guests: { label: 'Guests', icon: 'guests', to: '/guests' },
  
  // Hotel Ops
  rooms: { label: 'Room Status', icon: 'BedDouble', to: '/hotel-rooms' },
  housekeeping: { label: 'Housekeeping', icon: 'Sparkles', to: '/hotel-housekeeping' },
  frontdesk: { label: 'Front Desk', icon: 'BellConcierge', to: '/hotel-front-desk' },
  
  // Restaurant Ops
  kitchen: { label: 'Kitchen (KDS)', icon: 'ChefHat', to: '/restaurant-kitchen' },
  tables: { label: 'Table Map', icon: 'LayoutDashboard', to: '/restaurant-tables' },
  
  // Transit Ops
  fleet: { label: 'Fleet Status', icon: 'CarFront', to: '/transit-fleet' },
  drivers: { label: 'Drivers', icon: 'SteeringWheel', to: '/transit-drivers' },
  manifests: { label: 'Manifests', icon: 'FileSpreadsheet', to: '/transit-manifests' },
};


// ── Business-type-specific widget defaults ─────────────────────────────────
// When a tile is added, these defaults customize the widget for the business type.
// Falls back to the widget's own defaultProps if no override exists.
export const WIDGET_DEFAULTS_BY_TYPE = {
  RESTAURANT: {
    product_grid:   { title: 'Featured Menu Items', columns: 2, maxItems: 6, showPrice: true },
    showcase_gallery: { title: 'Food Gallery' },
    action_buttons: { showOrder: true, showBook: true, showFollow: true, showShare: true },
    hero_header:    { height: 'standard', overlayOpacity: 0.35 },
    review_carousel: { title: 'Diner Reviews' },
    promo_banner:   { ctaText: 'Order Now' },
    location_map:   { title: 'Find Our Restaurant' },
  },
  HOTEL: {
    product_grid:   { title: 'Featured Rooms', columns: 2, maxItems: 4, showPrice: true },
    showcase_gallery: { title: 'Our Property' },
    action_buttons: { showOrder: false, showBook: true, showFollow: true, showShare: true },
    hero_header:    { height: 'tall', overlayOpacity: 0.3 },
    review_carousel: { title: 'Guest Reviews' },
    promo_banner:   { ctaText: 'Book Now' },
    location_map:   { title: 'Find Us' },
    contact_card:   { showPhone: true, showWhatsApp: true, showEmail: true, showWebsite: true },
  },
  TRANSIT: {
    product_grid:   { title: 'Popular Routes', columns: 2, maxItems: 6, showPrice: true },
    showcase_gallery: { title: 'Our Fleet' },
    action_buttons: { showOrder: false, showBook: true, showFollow: true, showShare: true },
    hero_header:    { height: 'standard', overlayOpacity: 0.3 },
    review_carousel: { title: 'Passenger Reviews' },
    promo_banner:   { ctaText: 'Book Trip' },
    location_map:   { title: 'Terminals & Stops' },
    quick_info_bar: { showHours: true, showRating: true, showCategory: false, customInfo: 'On-time departures' },
  },
  RETAIL: {
    product_grid:   { title: 'Featured Products', columns: 2, maxItems: 6, showPrice: true },
    showcase_gallery: { title: 'Product Showcase' },
    action_buttons: { showOrder: true, showBook: false, showFollow: true, showShare: true },
    hero_header:    { height: 'standard', overlayOpacity: 0.3 },
    review_carousel: { title: 'Customer Reviews' },
    promo_banner:   { ctaText: 'Shop Now' },
    location_map:   { title: 'Visit Our Store' },
  },
  SERVICES: {
    product_grid:   { title: 'Our Services', columns: 2, maxItems: 6, showPrice: true },
    showcase_gallery: { title: 'Our Work' },
    action_buttons: { showOrder: false, showBook: true, showFollow: true, showShare: true },
    hero_header:    { height: 'standard', overlayOpacity: 0.3 },
    review_carousel: { title: 'Client Reviews' },
    promo_banner:   { ctaText: 'Book Now' },
    location_map:   { title: 'Our Location' },
  },
  GENERAL: {
    product_grid:   { title: 'Featured Products', columns: 2, maxItems: 6, showPrice: true },
    showcase_gallery: { title: 'Gallery' },
    action_buttons: { showOrder: true, showBook: false, showFollow: true, showShare: true },
    review_carousel: { title: 'Reviews' },
    promo_banner:   { ctaText: 'Learn More' },
    location_map:   { title: 'Find Us' },
  },
};

/** Get business-type-specific default props for a widget */
export function getWidgetDefaults(widgetType, businessType = 'GENERAL') {
  const typeDefaults = WIDGET_DEFAULTS_BY_TYPE[businessType] || WIDGET_DEFAULTS_BY_TYPE.GENERAL;
  return typeDefaults[widgetType] || {};
}