# Manual QA Checklist — AZM Business Portal

Generated as part of master4.md Section 6. Items checked statically are marked [DONE];
items requiring live click-through are marked [TODO].

## 1. List Pages — Empty States, Pagination, Skeletons

### [DONE] Empty state rendering
- All list pages use the `<Empty>` component with a title + optional action button.
- Checked: Invoices, Products, Orders, Reservations, Employees, Reviews, Transit Trips.

### [TODO] Pagination / infinite scroll past first page
- Verify with 100+ records: does `hasMore` + `skip` pagination actually load page 2?
- Check: Orders, Reservations, Invoices, Reviews, Transit Trips.

### [DONE] Skeleton loading states
- StatCards show `<Skeleton>` while loading.
- Tables show skeleton rows via `loading` prop on DataTable component.

## 2. Forms — Validation, Loading States, Double-Click Protection

### [DONE] Invoice creation — double-click protection
- `createMut.isPending` disables the submit button.
- Loading spinner shown during creation.

### [DONE] Payroll disbursement — double-click protection
- `loadingPayroll` flag disables the disburse button.
- Button shows loading state during API call.

### [TODO] Invalid data validation
- Try: negative amounts, empty required fields, invalid dates, oversized inputs.
- Check: Invoice create, Product create, Reservation create, Employee create, Payroll.

### [TODO] Slow/failing network
- Chrome DevTools throttle to Slow 3G — does button show loading state?
- Simulate 500 error — does button re-enable and show error toast?

## 3. Modals / Sheets — Escape, Backdrop, Focus Trapping

### [DONE] Escape key closes modals
- Added `keydown` listener for Escape in both `<Modal>` and `<Sheet>` components.

### [DONE] Backdrop click closes modals
- Both Modal and Sheet have `onClick={onClose}` on the backdrop overlay.

### [TODO] Focus trapping
- Currently modals don't trap focus — Tab can escape to the background.
- Consider adding `@radix-ui/react-dialog` or a focus-trap hook.

### [TODO] Closing mid-submit
- What happens if you close a modal while a mutation is in flight?
- Risk: half-finished operation + stale UI state.
- Fix: disable close button during `isPending` and show a warning.

## 4. Role-Based Access — Every Permission Template

### [DONE] Nav filtering by permission
- `hasPermission(item.perm)` filters nav items per role.
- Owner bypasses all permission checks.

### [DONE] Nav filtering by business type
- Hotel items (`hotel.view`) hidden for non-hotel businesses.
- Restaurant items (`restaurant.view`) hidden for non-restaurant businesses.
- Transit items (`transit.view`) hidden for non-transit businesses.

### [TODO] Role-specific click-through
- Log in as: Owner, Branch Manager, Front Desk, Kitchen Lead, Driver, Accountant.
- Verify nav + available actions differ.
- Verify no blank/broken pages for restricted roles.

## 5. Cross-Vertical — Business Type Mismatch

### [DONE] Nav filtering by business type
- RESTAURANT: hotel-only nav items hidden, transit items hidden.
- HOTEL: restaurant-only items hidden, transit items hidden.
- TRANSIT: hotel + restaurant items hidden.

### [TODO] Route-level guards
- Verify direct URL access to `/hotel-front-desk` as a RESTAURANT business shows a proper message, not a broken page.
- Verify same for `/restaurant-tables` as a HOTEL business, etc.

## 6. Bug Log

Track recurring issues found during manual QA. Feed patterns back into the route-checker (Section 5).

| Date | Page | Issue | Severity | Status |
|------|------|-------|----------|--------|
| 2026-07-18 | All modals | No Escape key handling | Medium | FIXED |
| 2026-07-18 | Nav | No business-type filtering for hotel/restaurant/transit items | High | FIXED |
| 2026-07-18 | 14 API endpoints | Frontend calls with no backend route | High | FIXED |
| - | - | - | - | - |
