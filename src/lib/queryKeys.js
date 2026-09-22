/**
 * Query-key factory — §5.1 of the INSTRUMENT spec.
 * No component hand-types a query key array. Every key comes from here.
 */

export const qk = {
  orders: {
    all:    (businessId) => ['orders', businessId],
    list:   (businessId, filters) => ['orders', businessId, 'list', filters],
    detail: (businessId, orderId) => ['orders', businessId, 'detail', orderId],
  },
  guests: {
    all:    (businessId) => ['guests', businessId],
    detail: (businessId, guestId) => ['guests', businessId, 'detail', guestId],
  },
  finance: {
    ledger:     (businessId, range) => ['finance', businessId, 'ledger', range],
    settlement: (businessId) => ['finance', businessId, 'settlement'],
  },
  kitchen: { tickets: (businessId) => ['kitchen', businessId, 'tickets'] },
  rooms:    { all: (businessId) => ['rooms', businessId] },
  fleet:    { vehicles: (businessId) => ['fleet', businessId, 'vehicles'] },
  invoices: {
    all:  (businessId) => ['invoices', businessId],
    list: (businessId, filters) => ['invoices', businessId, 'list', filters],
  },
  notifications: { all: (businessId) => ['notifications', businessId] },
  employees:     { all: (businessId) => ['employees', businessId] },
  products:      { all: (businessId) => ['products', businessId] },
};
