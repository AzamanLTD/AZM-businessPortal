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
  bookings: (tripId) => request(`/api/marketplace/transit/trips/${tripId}/book`, { method: 'POST' }),
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
    request(`/api/reservations/${resId}/counter-propose`, { method: "POST", body: JSON.stringify(data) }),
  acceptCounterProposal: (resId) =>
    request(`/api/reservations/${resId}/accept-counter`, { method: "POST" }),
};

// ── Employee Management ──────────────────────────────────────────────────
// All endpoints are under /api/business-os/ and use the request() function already imported at top of file

// ── Workforce API ────────────────────────────────────────────────────────────
export const employeeApi = {
  // Employee CRUD
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/business-os/employees${qs ? `?${qs}` : ''}`);
  },
  getEmployees: () => request('/api/business-os/employees'),
  getEmployee: (id) => request(`/api/business-os/employees/${id}`),
  addEmployee: (data) => request('/api/business-os/employees', { method: 'POST', body: JSON.stringify(data) }),
  create: (data) => request('/api/business-os/employees', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/api/business-os/employees/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id) => request(`/api/business-os/employees/${id}`, { method: 'DELETE' }),
  updatePermissions: (id, permissions) => request(`/api/business-os/employees/${id}/permissions`, { method: 'POST', body: JSON.stringify({ permissions }) }),
  // Self-service (employee's own data)
  me: () => request('/api/business-os/employees/me'),
  dashboard: () => request('/api/business-os/employees/my-dashboard'),
  myShifts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/business-os/employees/my-shifts${qs ? `?${qs}` : ''}`);
  },
  getShifts: (params = {}) => {
    if (typeof params === 'string') return request(`/api/business-os/employees/my-shifts?week=${params}`);
    const qs = new URLSearchParams(params).toString();
    return request(`/api/business-os/employees/my-shifts${qs ? `?${qs}` : ''}`);
  },
  myTeam: () => request('/api/business-os/employees/my-team'),
  myPayroll: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/business-os/employees/my-payroll${qs ? `?${qs}` : ''}`);
  },
  myEarnings: () => request('/api/business-os/employees/my-earnings'),
  ewaRequest: (data) => request('/api/business-os/employees/my-ewa-request', { method: 'POST', body: JSON.stringify(data) }),
  myFeedback: () => request('/api/business-os/employees/my-feedback'),
  // Open shifts for swap
  openShifts: () => request('/api/business-os/employees/shifts/open'),
  clockIn: (shiftId) => request(`/api/business-os/employees/shifts/${shiftId}/clock-in`, { method: 'POST' }),
  clockOut: (shiftId) => request(`/api/business-os/employees/shifts/${shiftId}/clock-out`, { method: 'POST' }),
  requestSwap: (shiftId, data) => request(`/api/business-os/employees/shifts/${shiftId}/request-swap`, { method: 'POST', body: JSON.stringify(data) }),
  swapRequests: () => request('/api/business-os/shifts/swaps'),
  claimSwap: (id) => request(`/api/business-os/shifts/swaps/${id}/claim`, { method: 'POST' }),
  // Time-off (self)
  requestTimeOff: (data) => request('/api/business-os/time-off', { method: 'POST', body: JSON.stringify(data) }),
  timeOff: () => request('/api/business-os/employees/my-time-off'),
  myTimeOff: () => request('/api/business-os/time-off/my-requests'),
};

export const shiftApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/business-os/shifts${qs ? `?${qs}` : ''}`);
  },
  getShifts: (params = {}) => shiftApi.list(params),
  create: (data) => request('/api/business-os/shifts', { method: 'POST', body: JSON.stringify(data) }),
  createShift: (data) => request('/api/business-os/shifts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/api/business-os/shifts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id) => request(`/api/business-os/shifts/${id}`, { method: 'DELETE' }),
  clockIn: (id) => request(`/api/business-os/shifts/${id}/clock-in`, { method: 'POST' }),
  clockOut: (id) => request(`/api/business-os/shifts/${id}/clock-out`, { method: 'POST' }),
  markNoShow: (id) => request(`/api/business-os/shifts/${id}/no-show`, { method: 'POST' }),
  teamOnDuty: () => request('/api/business-os/shifts/team/on-duty'),
  teamUpcoming: () => request('/api/business-os/shifts/team/upcoming'),
  mySchedule: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/business-os/shifts/my-schedule${qs ? `?${qs}` : ''}`);
  },
  createRotation: (data) => request('/api/business-os/shifts/rotation', { method: 'POST', body: JSON.stringify(data) }),
  // Swaps
  createSwap: (data) => request('/api/business-os/shifts/swaps', { method: 'POST', body: JSON.stringify(data) }),
  claimSwap: (id) => request(`/api/business-os/shifts/swaps/${id}/claim`, { method: 'POST' }),
  approveSwap: (id) => request(`/api/business-os/shifts/swaps/${id}/approve`, { method: 'POST' }),
  rejectSwap: (id, note) => request(`/api/business-os/shifts/swaps/${id}/reject`, { method: 'POST', body: JSON.stringify({ managerNote: note }) }),
  listSwaps: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/business-os/shifts/swaps${qs ? `?${qs}` : ''}`);
  },
};

export const timeOffApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/business-os/time-off${qs ? `?${qs}` : ''}`);
  },
  create: (data) => request('/api/business-os/time-off', { method: 'POST', body: JSON.stringify(data) }),
  approve: (id) => request(`/api/business-os/time-off/${id}/approve`, { method: 'POST' }),
  reject: (id, note) => request(`/api/business-os/time-off/${id}/reject`, { method: 'POST', body: JSON.stringify({ managerNote: note }) }),
  myRequests: () => request('/api/business-os/time-off/my-requests'),
};

export const payrollApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/business-os/payroll${qs ? `?${qs}` : ''}`);
  },
  summary: (period) => request(`/api/business-os/payroll/summary${period ? `?period=${period}` : ''}`),
  process: (data) => request('/api/business-os/payroll/process', { method: 'POST', body: JSON.stringify(data) }),
  processPayroll: (data) => request('/api/business-os/payroll/process', { method: 'POST', body: JSON.stringify(data) }),
  disburse: (data) => request('/api/business-os/payroll/disburse', { method: 'POST', body: JSON.stringify(data) }),
};

export const ewaApi = {
  eligibility: (employeeId) => request(`/api/business-os/ewa/eligibility/${employeeId}`),
  withdraw: (data) => request('/api/business-os/ewa/withdraw', { method: 'POST', body: JSON.stringify(data) }),
  history: (employeeId) => request(`/api/business-os/ewa/history/${employeeId}`),
  summary: () => request('/api/business-os/ewa/summary'),
};

export const feedbackApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/business-os/feedback${qs ? `?${qs}` : ''}`);
  },
  give: (data) => request('/api/business-os/feedback', { method: 'POST', body: JSON.stringify(data) }),
  forEmployee: (employeeId) => request(`/api/business-os/feedback/for/${employeeId}`),
  byEmployee: (employeeId) => request(`/api/business-os/feedback/by/${employeeId}`),
};

export const financeApi = {
  getLedger: () => request('/api/business-os/ledger'),
  payOut: (amount, destination) => request('/api/business-os/finance/payout', { method: 'POST', body: JSON.stringify({ amount, destination }) }),
  getDashboard: (params) => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
    return request(`/api/business-os/finance/dashboard${qs}`);
  },
  getPnL: (params) => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
    return request(`/api/business-os/finance/pl${qs}`);
  },
  getCashflow: (params) => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
    return request(`/api/business-os/finance/cashflow${qs}`);
  },
  getExpenses: (params) => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
    return request(`/api/business-os/finance/expenses${qs}`);
  },
  getEscrowHeld: () => request('/api/business-os/finance/escrow-held'),
  getRecurring: () => request('/api/business-os/finance/recurring'),
  createRecurring: (data) => request('/api/business-os/finance/recurring', { method: 'POST', body: JSON.stringify(data) }),
  updateRecurring: (id, data) => request(`/api/business-os/finance/recurring/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteRecurring: (id) => request(`/api/business-os/finance/recurring/${id}`, { method: 'DELETE' }),
  getPayrollPosition: () => request('/api/business-os/finance/payroll-position'),
  getLedgerDashboard: (params) => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
    return request(`/api/business-os/ledger/dashboard${qs}`);
  },
  getProfitLoss: (params) => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
    return request(`/api/business-os/ledger/profit-loss${qs}`);
  },
  getLedgerExpenses: (params) => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
    return request(`/api/business-os/ledger/expenses${qs}`);
  },
  createLedgerEntry: (data) => request('/api/business-os/ledger', { method: 'POST', body: JSON.stringify(data) }),
  deleteLedgerEntry: (id) => request(`/api/business-os/ledger/${id}`, { method: 'DELETE' })
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

  // Rate Calendar
  getRateCalendar: (days = 14) => request(`/api/business-os/hotel/rate-calendar?days=${days}`),
  upsertRateOverride: (data) => request('/api/business-os/hotel/rate-calendar', { method: 'POST', body: JSON.stringify(data) }),
  deleteRateOverride: (id) => request(`/api/business-os/hotel/rate-calendar/${id}`, { method: 'DELETE' }),
  // Room Block
  blockRoom: (roomId, data) => request(`/api/business-os/hotel/rooms/${roomId}/block`, { method: 'POST', body: JSON.stringify(data) }),
  deleteRoomBlock: (blockId) => request(`/api/business-os/hotel/rooms/block/${blockId}`, { method: 'DELETE' }),
  // Room CRUD
  updateRoom: (id, data) => request(`/api/business-os/hotel/rooms/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  bulkCreateRooms: (data) => request('/api/business-os/hotel/rooms/bulk', { method: 'POST', body: JSON.stringify(data) }),
  // Front Desk extended
  walkIn: (data) => request('/api/business-os/hotel/front-desk/walk-in', { method: 'POST', body: JSON.stringify(data) }),
  moveRoom: (reservationId, data) => request(`/api/business-os/hotel/front-desk/${reservationId}/move-room`, { method: 'POST', body: JSON.stringify(data) }),
  // Housekeeping create
  createTask: (data) => request('/api/business-os/hotel/housekeeping', { method: 'POST', body: JSON.stringify(data) }),
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
  getTables: (params) => request(`/api/business-os/restaurant/tables${params?.locationId ? '?locationId=' + params.locationId : ''}`),
  tables: () => restaurantOpsApi.getTables(),  // alias
  updateTableStatus: (id, status) => request(`/api/business-os/restaurant/tables/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // 86'd Items
  get86edItems: () => request('/api/business-os/restaurant/86ed-items'),
  toggle86: (data) => request('/api/business-os/restaurant/toggle-86', { method: 'POST', body: JSON.stringify(data) }),

  // ── Waitlist (Module 04) ────────────────────────────────────────────────
  getWaitlist: (status) => {
    const qs = status ? `?status=${status}` : '';
    return request(`/api/business-os/restaurant/waitlist${qs}`);
  },
  addWaitlist: (data) => request('/api/business-os/restaurant/waitlist', { method: 'POST', body: JSON.stringify(data) }),
  updateWaitlist: (id, data) => request(`/api/business-os/restaurant/waitlist/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  removeWaitlist: (id) => request(`/api/business-os/restaurant/waitlist/${id}`, { method: 'DELETE' }),

  // ── Table metadata / floor plan (Module 04) ───────────────────────────
  updateTableMetadata: (tableId, metadata) => request(`/api/business-os/restaurant/tables/${tableId}/metadata`, { method: 'PATCH', body: JSON.stringify({ metadata }) }),

  // ── Catalog sections (Module 04) ──────────────────────────────────────
  getSections: () => request('/api/business/catalog/sections'),
  createSection: (data) => request('/api/business/catalog/sections', { method: 'POST', body: JSON.stringify(data) }),
  updateSection: (id, data) => request(`/api/business/catalog/sections/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteSection: (id) => request(`/api/business/catalog/sections/${id}`, { method: 'DELETE' }),
  reorderSections: (orderedIds) => request('/api/business-os/restaurant/sections/reorder', { method: 'PATCH', body: JSON.stringify({ orderedIds }) }),
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

  // Module 05: Route Templates
  routeTemplates: () => request('/api/business-os/transit/routes'),
  createRouteTemplate: (data) => request('/api/business-os/transit/routes', { method: 'POST', body: JSON.stringify(data) }),
  deleteRouteTemplate: (id) => request(`/api/business-os/transit/routes/${id}`, { method: 'DELETE' }),
  generateTrips: (data) => request('/api/business-os/transit/routes/generate-trips', { method: 'POST', body: JSON.stringify(data) }),

  // Module 05: Trip Cancel
  cancelTrip: (tripId) => request(`/api/business-os/transit/trips/${tripId}/cancel`, { method: 'POST', body: JSON.stringify({}) }),

  // Module 05: Maintenance Overdue
  maintenanceOverdue: () => request('/api/business-os/transit/maintenance/overdue'),
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

  // Module 05: Proof of Delivery
  attachProof: (id, url) => request(`/api/business-os/transit/cargo/${id}/proof`, { method: 'PATCH', body: JSON.stringify({ proofOfDeliveryUrl: url }) }),
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


// ── Phase 3 Retail: Suppliers, Purchase Orders, Stock Counts ────────────────
export const retailApi = {
  // Suppliers
  listSuppliers: () => request('/api/business-os/retail/suppliers'),
  createSupplier: (data) => request('/api/business-os/retail/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  updateSupplier: (id, data) => request(`/api/business-os/retail/suppliers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteSupplier: (id) => request(`/api/business-os/retail/suppliers/${id}`, { method: 'DELETE' }),

  // Purchase Orders
  listPurchaseOrders: () => request('/api/business-os/retail/purchase-orders'),
  createPurchaseOrder: (data) => request('/api/business-os/retail/purchase-orders', { method: 'POST', body: JSON.stringify(data) }),
  updatePurchaseOrder: (id, data) => request(`/api/business-os/retail/purchase-orders/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Stock Counts
  listStockCounts: () => request('/api/business-os/retail/stock-counts'),
  createStockCount: (data) => request('/api/business-os/retail/stock-counts', { method: 'POST', body: JSON.stringify(data) }),
  updateStockCountItem: (countId, itemId, data) => request(`/api/business-os/retail/stock-counts/${countId}/items/${itemId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  reconcileStockCount: (id) => request(`/api/business-os/retail/stock-counts/${id}/reconcile`, { method: 'POST' }),

  // Low Stock
  lowStock: () => request('/api/business-os/retail/low-stock'),

  // Product barcode/SKU update
  updateProductBarcode: (productId, data) => request(`/api/business-os/retail/products/${productId}/barcode`, { method: 'PATCH', body: JSON.stringify(data) }),
};
export default marketplaceApi;


// ── MODULE 06: Universal Booking, Orders & Invoicing ────────────────────────
export const bookingOpsApi = {
  // Tax Presets
  taxPresets: () => request('/api/business-os/tax-presets'),
  createTaxPreset: (data) => request('/api/business-os/tax-presets', { method: 'POST', body: JSON.stringify(data) }),
  updateTaxPreset: (id, data) => request(`/api/business-os/tax-presets/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteTaxPreset: (id) => request(`/api/business-os/tax-presets/${id}`, { method: 'DELETE' }),

  // Overbooking toggle
  setOverbooking: (allowed) => request('/api/business-os/overbooking', { method: 'PATCH', body: JSON.stringify({ allowed }) }),

  // Reservation Reschedule
  proposeReschedule: (id, data) => request(`/api/business-os/reservations/${id}/propose-reschedule`, { method: 'POST', body: JSON.stringify(data) }),
  respondReschedule: (id, accept) => request(`/api/business-os/reservations/${id}/respond-reschedule`, { method: 'POST', body: JSON.stringify({ accept }) }),

  // Slot Preview
  slotsPreview: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/business-os/availability/slots-preview${qs ? '?' + qs : ''}`);
  },

  // Bulk Order Operations
  bulkOrderStatus: (orderIds, status) => request('/api/business-os/orders/bulk-status', { method: 'POST', body: JSON.stringify({ orderIds, status }) }),

  // Order Refund
  refundOrder: (id, reason) => request(`/api/business-os/orders/${id}/refund`, { method: 'POST', body: JSON.stringify({ reason }) }),

  // Invoice Stats
  invoiceStats: () => request('/api/business-os/invoices/stats'),

  // Recurring Invoices (Phase 3)
  listRecurring: () => request('/api/business-os/invoices/recurring'),
  enableRecurring: (invoiceId, interval) => request(`/api/business-os/invoices/${invoiceId}/enable-recurring`, { method: 'POST', body: JSON.stringify({ interval }) }),
  disableRecurring: (invoiceId) => request(`/api/business-os/invoices/${invoiceId}/disable-recurring`, { method: 'POST' }),
  processRecurring: () => request('/api/business-os/invoices/process-recurring', { method: 'POST' }),

  // Booking Dashboard
  bookingDashboard: () => request('/api/business-os/booking/dashboard'),
};

// ── Analytics API ────────────────────────────────────────────────────────────
export const analyticsApi = {
  getCustomer: () => request('/api/business-os/analytics/customer'),
  getOperational: () => request('/api/business-os/analytics/operational'),
};

// ── Module 08: Marketing & Promotions API ──────────────────────────────────
export const marketingApi = {
  // Promotions CRUD
  getPromotions: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/business-os/marketing/promotions${qs ? `?${qs}` : ''}`);
  },
  createPromotion: (data) => request('/api/business-os/marketing/promotions', { method: 'POST', body: JSON.stringify(data) }),
  updatePromotion: (id, data) => request(`/api/business-os/marketing/promotions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deletePromotion: (id) => request(`/api/business-os/marketing/promotions/${id}`, { method: 'DELETE' }),

  // Review management
  respondToReview: (reviewId, response) => request(`/api/business-os/marketing/reviews/${reviewId}/respond`, { method: 'POST', body: JSON.stringify({ response }) }),
  flagReview: (reviewId, reason) => request(`/api/business-os/marketing/reviews/${reviewId}/flag`, { method: 'POST', body: JSON.stringify({ reason }) }),

  // Broadcast to followers
  broadcast: (title, message) => request('/api/business-os/marketing/broadcast', { method: 'POST', body: JSON.stringify({ title, message }) }),
  getFollowers: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/business-os/marketing/followers${qs ? `?${qs}` : ''}`);
  },
};


// ── Phase 2: In-Portal Messaging API (Section 3) ───────────────────────────
export const messagingApi = {
  getConversations: () => request('/api/business-os/messages/conversations'),
  startConversation: (recipientUserId) =>
    request('/api/business-os/messages/conversations', { method: 'POST', body: JSON.stringify({ recipientUserId }) }),
  getMessages: (conversationId) => request(`/api/business-os/messages/${conversationId}`),
  sendMessage: (conversationId, content) =>
    request(`/api/business-os/messages/${conversationId}/send`, { method: 'POST', body: JSON.stringify({ content }) }),
};

