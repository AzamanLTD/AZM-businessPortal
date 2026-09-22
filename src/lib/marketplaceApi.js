import { request } from './apiCore';

export const transit = {
  // Backend: GET /api/marketplace/business/trips — scoped to the caller's
  // own business (NOT the customer-facing browse endpoint, which mixed in
  // every business's trips).
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/marketplace/business/trips${qs ? `?${qs}` : ''}`);
  },
  // Backend: no single-trip GET exists, use list with id filter
  get: (id) => request(`/api/marketplace/business/trips?id=${id}`),
  // Backend: POST /api/marketplace/business/trips — requires vehicleId
  create: (data) => request('/api/marketplace/business/trips', { method: 'POST', body: JSON.stringify(data) }),
  // Backend: PATCH /api/marketplace/business/trips/:id — ownership-checked,
  // partial update. vehicleId is intentionally immutable after creation.
  update: (id, data) => request(`/api/marketplace/business/trips/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  // Backend: DELETE /api/marketplace/business/trips/:id — ownership-checked,
  // blocked (400) if the trip already has seat bookings.
  remove: (id) => request(`/api/marketplace/business/trips/${id}`, { method: 'DELETE' }),
  // Backend: GET /api/marketplace-seat-map/:tripId
  getSeatMap: (tripId) => request(`/api/marketplace-seat-map/${tripId}`),
  // Backend: PUT /api/marketplace-seat-map/:tripId — expects { layout, rows, cols, tierFares } at top level
  updateSeatMap: (tripId, payload) => request(`/api/marketplace-seat-map/${tripId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  // Backend: GET /api/marketplace/transit/trips/:id/book (not quite - check)
  bookings: (tripId) => request(`/api/marketplace/transit/trips/${tripId}/book`),
};

export const reservations = {
  // Backend uses /api/reservations (not /api/business/reservations)
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/reservations/business/me${qs ? `?${qs}` : ''}`);
  },
  get: (id) => request(`/api/reservations/${id}`),
  confirm: (id) => request(`/api/reservations/${id}/confirm`, { method: 'PATCH' }),
  cancel: (id, reason) => request(`/api/reservations/${id}/cancel`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
  markNoShow: (id) => request(`/api/reservations/${id}/no-show`, { method: 'PATCH' }),
  checkIn: (id) => request(`/api/reservations/${id}/checkin`, { method: 'PATCH' }),
  checkOut: (id) => request(`/api/reservations/${id}/checkout`, { method: 'PATCH' }),
  stats: () => request('/api/business/reservations/stats'),
};

export const checkIn = {
  verifyToken: (token) => request('/api/marketplace/checkin/verify', { method: 'POST', body: JSON.stringify({ token }) }),
  searchByAzamanId: (azamanId) => request(`/api/marketplace/checkin/search?azamanId=${encodeURIComponent(azamanId)}`),
  directCheckIn: (reservationId) => request('/api/marketplace/checkin/direct', { method: 'POST', body: JSON.stringify({ reservationId }) }),
  todayStats: () => request('/api/business/checkin/stats'),
  recentCheckIns: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/business/checkin/recent${qs ? `?${qs}` : ''}`);
  },
};

export const reviews = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/business/reviews${qs ? `?${qs}` : ''}`);
  },
  stats: () => request('/api/business/reviews/stats'),
  promoteToStory: (reviewId) => request(`/api/marketplace/reviews/${reviewId}/share-story`, { method: 'POST' }),
  stories: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/business/stories${qs ? `?${qs}` : ''}`);
  },
};

export const marketplaceStats = {
  overview: () => request('/api/business/marketplace/stats'),
};

export const marketplaceApi = {
  // ── Dine-In (uses /api/dine-in/tabs) ─────────────────────────────────────
  openDineInTab: (businessProfileId, customerAzamanId) =>
    request('/api/dine-in/tabs', { method: "POST", body: JSON.stringify({ businessProfileId, customerAzamanId }) }),

  addDineInItem: (tabId, { productId, name, unitPriceUsdc, quantity }) =>
    request(`/api/dine-in/tabs/${tabId}/items`, { method: "POST", body: JSON.stringify({ productId, name, unitPriceUsdc, quantity }) }),

  finalizeDineInTab: (tabId, { taxRatePct, tipUsdc }) =>
    request(`/api/dine-in/tabs/${tabId}/finalize`, { method: "POST", body: JSON.stringify({ taxRatePct, tipUsdc }) }),

  getDineInTab: (tabId) => request(`/api/dine-in/tabs/${tabId}`),
  getOpenTabs: () => request('/api/dine-in/tabs'),
  confirmDineInTab: (tabId) => request(`/api/dine-in/tabs/${tabId}/pay`, { method: "POST", body: JSON.stringify({}) }),
  reportDineInDefault: (tabId, reason) => request(`/api/dine-in/tabs/${tabId}/default`, { method: "POST", body: JSON.stringify({ reason }) }),

  // ── Guests (uses /api/dine-in/guests) ────────────────────────────────────
  getGuests: () => request('/api/dine-in/guests'),
  searchGuest: (query) => request(`/api/dine-in/guests/search?q=${encodeURIComponent(query)}`),

  // ── Ad Posts (uses /api/ad-posts) ─────────────────────────────────────────
  getAdPosts: (businessProfileId) => request(`/api/ad-posts/active/${businessProfileId}`),
  createAdPost: (data) => request('/api/ad-posts', { method: "POST", body: JSON.stringify(data) }),
  deleteAdPost: (adPostId) => request(`/api/ad-posts/${adPostId}`, { method: "DELETE" }),
  getAdFeed: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/ad-posts/feed${qs ? `?${qs}` : ''}`);
  },

  // ── Showcase (uses /api/showcases) ────────────────────────────────────────
  getShowcase: (businessProfileId) => request(`/api/showcases/${businessProfileId}`),
  addShowcaseSlide: (businessProfileId, data) => request('/api/showcases', { method: "POST", body: JSON.stringify({ businessProfileId, ...data }) }),
  updateShowcaseSlide: (slideId, data) => request(`/api/showcases/${slideId}`, { method: "PATCH", body: JSON.stringify(data) }),
  removeShowcaseSlide: (businessProfileId, slideId) => request(`/api/showcases/${slideId}`, { method: "DELETE" }),
  reorderShowcase: (businessProfileId, slides) => request('/api/showcases/reorder', { method: "POST", body: JSON.stringify({ slides }) }),

  // ── Follows (uses /api/follows) ───────────────────────────────────────────
  followBusiness: (businessProfileId) => request('/api/follows', { method: "POST", body: JSON.stringify({ businessProfileId }) }),
  unfollowBusiness: (businessProfileId) => request(`/api/follows/${businessProfileId}`, { method: "DELETE" }),
  checkFollowing: (businessProfileId) => request(`/api/follows/check/${businessProfileId}`),
  getMyFollowing: () => request('/api/follows/following'),
  getMyFollowers: () => request('/api/follows/followers'),

  // ── Finance (uses /api/marketplace-finance) ──────────────────────────────
  getFinanceStats: () => request('/api/marketplace-finance/stats'),
  getFinanceTransactions: () => request('/api/marketplace-finance/transactions'),

  // ── Seat Map (uses /api/marketplace-seat-map) ─────────────────────────────
  getSeatMap: (tripId) => request(`/api/marketplace-seat-map/${tripId}`),
  saveSeatMap: (tripId, layout) => request(`/api/marketplace-seat-map/${tripId}`, { method: "PUT", body: JSON.stringify({ layout }) }),

  // ── Penalty Policy (uses /api/marketplace-penalty) ────────────────────────
  getPenaltyPolicy: () => request('/api/marketplace-penalty'),
  updatePenaltyPolicy: (data) => request('/api/marketplace-penalty', { method: "PUT", body: JSON.stringify(data) }),

  // ── Reservations: counter-propose (uses existing reservation routes) ──────
  counterProposeReservation: (resId, data) =>
    request(`/api/business/reservations/${resId}/counter-propose`, { method: "POST", body: JSON.stringify(data) }),
  acceptCounterProposal: (resId) =>
    request(`/api/business/reservations/${resId}/accept-counter`, { method: "POST" }),
};

// ── Employee Management ──────────────────────────────────────────────────
// All endpoints are under /api/business-os/ and use the request() function already imported at top of file

// Module 01 (permissions): every method maps to a REAL mounted route in
// AZM-backend routes/businessOSRoutes.js. The previous adapter mixed missing
// methods with a phantom /employees/:id/terminate route (404) and a payload
// vocabulary the backend never understood (permissions as a boolean object
// instead of a dotted-key string array). Permissions now flow from the
// canonical catalog exposed at GET /api/business-os/permission-templates.
export const employeeApi = {
  // GET /api/business-os/employees -> { success, employees }
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/business-os/employees${qs ? `?${qs}` : ''}`);
  },
  // POST /api/business-os/employees — requires 'employees.create'.
  // Payload: { azmId, role, title, department, payrollType, salaryAmount,
  // hourlyRate, permissions: ['employees.view', ...] }
  create: (data) => request('/api/business-os/employees', { method: 'POST', body: JSON.stringify(data) }),
  // GET /api/business-os/employees/:id
  get: (id) => request(`/api/business-os/employees/${id}`),
  // PATCH /api/business-os/employees/:id — requires 'employees.update'
  update: (id, data) => request(`/api/business-os/employees/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  // DELETE /api/business-os/employees/:id — requires 'employees.terminate'
  remove: (id) => request(`/api/business-os/employees/${id}`, { method: 'DELETE' }),
  // Termination keeps the reason: there is no /terminate route; PATCH the
  // status (backend stamps terminationDate automatically).
  terminate: (id, reason) =>
    request(`/api/business-os/employees/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'TERMINATED', ...(reason ? { notes: reason } : {}) }),
    }),
  // POST /api/business-os/employees/:id/permissions — requires 'employees.permissions'
  updatePermissions: (id, permissions) =>
    request(`/api/business-os/employees/${id}/permissions`, { method: 'POST', body: JSON.stringify({ permissions }) }),
  // GET /api/business-os/dashboard/employee-stats -> { success, stats }
  dashboard: () => request('/api/business-os/dashboard/employee-stats'),
  // GET /api/business-os/permission-templates -> { success, templates, permissionKeys }
  // permissionKeys is the canonical catalog grouped by module.
  permissionTemplates: () => request('/api/business-os/permission-templates'),
  // Shifts / swaps
  getShifts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/business-os/shifts${qs ? `?${qs}` : ''}`);
  },
  createShift: (data) => request('/api/business-os/shifts', { method: 'POST', body: JSON.stringify(data) }),
  // GET /api/business-os/shifts/swaps -> { success, swaps }
  swapRequests: () => request('/api/business-os/shifts/swaps'),
  approveSwap: (id) => request(`/api/business-os/shifts/swaps/${id}/approve`, { method: 'POST' }),
  rejectSwap: (id) => request(`/api/business-os/shifts/swaps/${id}/reject`, { method: 'POST' }),
  // Time off
  timeOffRequests: () => request('/api/business-os/time-off'),
  requestTimeOff: (data) => request('/api/business-os/time-off', { method: 'POST', body: JSON.stringify(data) }),
  approveTimeOff: (id) => request(`/api/business-os/time-off/${id}/approve`, { method: 'POST' }),
  rejectTimeOff: (id) => request(`/api/business-os/time-off/${id}/reject`, { method: 'POST' }),
  // Payroll — period format is 'YYYY-MM' (see payrollService.processAllPayroll)
  runPayroll: (data) => request('/api/business-os/payroll/process', { method: 'POST', body: JSON.stringify(data) }),

  // ── Legacy aliases (older call sites) ────────────────────────────────────
  getEmployees: () => employeeApi.list(),
  addEmployee: (data) => employeeApi.create(data),
  terminateEmployee: (id, reason) => employeeApi.terminate(id, reason),
  processPayroll: (data) => employeeApi.runPayroll(data),
};

export const financeApi = {
  getLedger: () => request('/api/business-os/ledger'),
  getCashFlow: (days = 30) => request(`/api/business-os/finance/cash-flow?days=${days}`),
  getPnl: (month) => request(`/api/business-os/finance/pnl?month=${month}`),
  payOut: (amount, destination) => request('/api/business-os/finance/payout', { method: 'POST', body: JSON.stringify({ amount, destination }) }),
};

export const hotelOpsApi = {
  // Rooms
  getRooms: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/business-os/hotel/rooms${qs ? `?${qs}` : ''}`);
  },
  rooms: (params = {}) => hotelOpsApi.getRooms(params),  // alias
  createRoom: (data) => request('/api/business-os/hotel/rooms', { method: 'POST', body: JSON.stringify(data) }),
  updateRoomStatus: (id, status) => request(`/api/business-os/hotel/rooms/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  getRoomRack: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/business-os/hotel/room-rack${qs ? `?${qs}` : ''}`);
  },

  // Housekeeping
  getHousekeepingTasks: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/business-os/hotel/housekeeping${qs ? `?${qs}` : ''}`);
  },
  housekeeping: (params = {}) => hotelOpsApi.getHousekeepingTasks(params),  // alias
  assignTask: (id, employeeId) => request(`/api/business-os/hotel/housekeeping/${id}/assign`, { method: 'POST', body: JSON.stringify({ employeeId }) }),
  updateChecklist: (id, checklist) => request(`/api/business-os/hotel/housekeeping/${id}/checklist`, { method: 'PATCH', body: JSON.stringify({ checklist }) }),
  completeTask: (id) => request(`/api/business-os/hotel/housekeeping/${id}/complete`, { method: 'POST' }),
  inspectTask: (id, data) => request(`/api/business-os/hotel/housekeeping/${id}/inspect`, { method: 'POST', body: JSON.stringify(data) }),
  updateHousekeepingStatus: (id, status) => {
    // Map simple status to appropriate backend action
    if (status === 'COMPLETED' || status === 'DONE') return hotelOpsApi.completeTask(id);
    return hotelOpsApi.updateChecklist(id, { status });
  },

  // Front Desk
  getFrontDesk: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/business-os/hotel/front-desk${qs ? `?${qs}` : ''}`);
  },
  arrivals: (date) => hotelOpsApi.getFrontDesk({ type: 'arrivals', date }),
  departures: (date) => hotelOpsApi.getFrontDesk({ type: 'departures', date }),
  inHouse: () => hotelOpsApi.getFrontDesk({ type: 'inhouse' }),
};

export const restaurantOpsApi = {
  // Kitchen Display System
  getKitchenOrders: () => request('/api/business-os/restaurant/kds'),
  kitchenOrders: (params = {}) => {
    // Don't send 'ACTIVE' status — backend defaults to NEW+PREPARING
    const { status, ...rest } = params;
    const qs = new URLSearchParams(rest).toString();
    return request(`/api/business-os/restaurant/kds${qs ? `?${qs}` : ''}`);
  },
  createKitchenOrder: (data) => request('/api/business-os/restaurant/kds', { method: 'POST', body: JSON.stringify(data) }),
  updateOrderStatus: (id, status) => request(`/api/business-os/restaurant/kds/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  bumpKitchenOrder: (id) => request(`/api/business-os/restaurant/kds/${id}/bump`, { method: 'POST' }),
  updateItemStatus: (orderId, itemId, status) => request(`/api/business-os/restaurant/kds/${orderId}/item-status`, { method: 'PATCH', body: JSON.stringify({ itemId, status }) }),
  assignChef: (orderId, chefId) => request(`/api/business-os/restaurant/kds/${orderId}/assign-chef`, { method: 'POST', body: JSON.stringify({ chefId }) }),
  getKitchenStats: () => request('/api/business-os/restaurant/kds/stats'),

  // Tables
  getTables: () => request('/api/business-os/restaurant/tables'),
  tables: () => restaurantOpsApi.getTables(),  // alias
  updateTableStatus: (id, status) => request(`/api/business-os/restaurant/tables/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // 86'd Items
  get86edItems: () => request('/api/business-os/restaurant/86ed-items'),
  toggle86: (data) => request('/api/business-os/restaurant/toggle-86', { method: 'POST', body: JSON.stringify(data) }),
};

export const transitOpsApi = {
  // Fleet
  getVehicles: () => request('/api/business-os/transit/fleet'),
  fleet: () => transitOpsApi.getVehicles(),  // alias
  updateVehicleStatus: (id, status) => request(`/api/business-os/transit/vehicles/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  createVehicle: (data) => request('/api/business-os/transit/fleet', { method: 'POST', body: JSON.stringify(data) }),

  // Maintenance
  maintenance: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/business-os/transit/fleet/maintenance${qs ? `?${qs}` : ''}`);
  },
  createMaintenance: (data) => request('/api/business-os/transit/fleet/maintenance', { method: 'POST', body: JSON.stringify(data) }),
  updateMaintenance: (id, data) => request(`/api/business-os/transit/fleet/maintenance/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Drivers
  drivers: () => request('/api/business-os/transit/drivers'),
  assignDriver: (data) => request('/api/business-os/transit/drivers/assign', { method: 'POST', body: JSON.stringify(data) }),
  updateDriverStatus: (id, status) => request(`/api/business-os/transit/drivers/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  driverSchedule: () => request('/api/business-os/transit/drivers/my-schedule'),
  driverCalendar: (month) => request(`/api/business-os/transit/drivers?month=${month}`),

  // Cargo & IROPS
  cargo: (params = {}) => cargoApi.list(params),
  createCargo: (data) => cargoApi.create(data),
  updateCargoStatus: (id, status) => cargoApi.updateStatus(id, status),
  iropsReassign: (data) => cargoApi.reassign(data),

  // Manifests
  getManifests: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/business-os/transit/manifests${qs ? `?${qs}` : ''}`);
  },
  liveManifest: (tripId) => request(`/api/business-os/transit/manifests/${tripId}`),
  boardPassenger: (data) => request('/api/business-os/transit/manifests/board', { method: 'POST', body: JSON.stringify(data) }),

  // Routes — use transit trips endpoint
  routes: () => request('/api/business/transit/trips'),
};


// ── Transit: Cargo & IROPS ─────────────────────────────────────────────────────
export const cargoApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/business-os/transit/cargo${qs ? `?${qs}` : ''}`);
  },
  create: (data) => request('/api/business-os/transit/cargo', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (id, status) => request(`/api/business-os/transit/cargo/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  remove: (id) => request(`/api/business-os/transit/cargo/${id}`, { method: 'DELETE' }),
  reassign: (data) => request('/api/business-os/transit/irops/reassign', { method: 'POST', body: JSON.stringify(data) }),
};

// ── Restaurant: Inventory & Recipes ────────────────────────────────────────────
export const inventoryApi = {
  list: () => request('/api/business-os/restaurant/inventory'),
  create: (data) => request('/api/business-os/restaurant/inventory', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/api/business-os/restaurant/inventory/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  restock: (id, quantity) => request(`/api/business-os/restaurant/inventory/${id}/restock`, { method: 'POST', body: JSON.stringify({ quantity }) }),
  recipes: () => request('/api/business-os/restaurant/recipes'),
  linkIngredient: (productId, data) => request(`/api/business-os/restaurant/recipes/${productId}/link`, { method: 'POST', body: JSON.stringify(data) }),
  unlinkIngredient: (productId, itemId) => request(`/api/business-os/restaurant/recipes/${productId}/link/${itemId}`, { method: 'DELETE' }),
  deductForOrder: (orderId) => request(`/api/business-os/restaurant/inventory/deduct/${orderId}`, { method: 'POST' }),
};

export default marketplaceApi;
