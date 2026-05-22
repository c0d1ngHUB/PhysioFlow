# PhysioFlow — Fixes Applied

**Date:** 2026-05-05
**Reviewer:** Chloe (from Forge's original review)

---

## Critical Fixes (3/3)

### 1. ✅ ALTER TABLE in Route Module
**Status:** Already fixed — no ALTER TABLE statements found in `patients.ts`. Migration 006 is the single source of truth.

### 2. ✅ Debug Logs in Production
**Status:** Already fixed — debug request logger is wrapped in `if (process.env.NODE_ENV !== 'production')`.

### 3. ✅ Error Boundary in Frontend
**Status:** Fixed
- Added `src/components/ErrorBoundary.tsx` — React error boundary with retry button
- Wrapped lazy-loaded routes with `<ErrorBoundary>` in `App.tsx`
- Prevents full SPA crash from single component errors

## Medium Priority Fixes (7/8)

### 4. ✅ Rate Limiting on GET Endpoints
- Added generic GET rate limiter (120/min per IP) to all `/api/*` GET routes
- Existing specific rate limiters (PDF, iCal, SMS, CRUD) remain unchanged

### 5. ✅ Dynamic SQL Whitelist
- `patients.ts` PUT: Replaced hardcoded if-chains with `ALLOWED_PATIENT_FIELDS` whitelist
- `expenses.ts` PUT: Replaced hardcoded if-chains with `ALLOWED_EXPENSE_FIELDS` whitelist
- Both now iterate `Object.keys(body)` filtered by allowed field sets

### 6. ✅ Zod Validation for Missing Endpoints
- Added `therapistCreateSchema` and `therapistUpdateSchema` to `validation.ts`
- Added `smsSendSchema` to `validation.ts`
- Applied `validateBody()` to `POST /api/therapists`, `PUT /api/therapists/:id`, `POST /api/sms/send`

### 7. ✅ Vite Security Vulnerabilities
**Status:** Already fixed — Vite is on `8.0.10` (latest), which patches the known CVEs from `8.0.2`.

### 8. ✅ Duplicated Utility Functions
- `getSingleQueryValue()`: Removed from `appointments.ts`, `invoices.ts`, `expenses.ts` — now imported from `utils/formatting.ts`
- `formatCurrency()`: Removed local definitions from `Expenses.tsx`, `Invoices.tsx` — now imported from `src/utils/formatting.ts` (frontend) and `server/utils/formatting.ts` (backend)
- Inline `Intl.NumberFormat` calls in `Patients.tsx` and `Admin.tsx` replaced with `formatCurrency()` import
- `isAllowedOrigin()` / `getAllowedOrigins()`: Unified — exported from `utils/csrf.ts`, imported in `index.ts` (duplicate local definition removed)

### 9. ✅ Unhandled Rejection Handler
- Added `process.on('unhandledRejection')` and `process.on('uncaughtException')` handlers to `server/index.ts`

## Not Addressed (Deferred)

### Missing Indexes (Low Priority)
- `appointments(status)`, `audit_logs(timestamp)`, `audit_logs(action)` — should be added via migration

### No `.env.example`
- Nice-to-have for developer onboarding

### Frontend Pagination
- API supports it, frontend doesn't use it yet

### Inconsistent API Response Formats
- Some routes return `{ data }`, others `{ message }`, others `{ data, pagination }`

---

## Files Modified

| File | Changes |
|------|---------|
| `src/components/ErrorBoundary.tsx` | New — Error boundary component |
| `src/App.tsx` | Import ErrorBoundary, wrap lazy routes |
| `src/pages/Expenses.tsx` | Import shared `formatCurrency`, remove local definition |
| `src/pages/Invoices.tsx` | Import shared `formatCurrency`, remove local definition |
| `src/pages/Patients.tsx` | Import shared `formatCurrency`, replace inline call |
| `src/pages/Admin.tsx` | Import shared `formatCurrency`, replace inline call |
| `src/utils/formatting.ts` | New — shared frontend `formatCurrency` |
| `server/index.ts` | GET rate limiter, remove duplicated `getAllowedOrigins`/`isAllowedOrigin`, import from csrf.ts, add unhandledRejection handler, fix unused var |
| `server/utils/csrf.ts` | Export `getAllowedOrigins` and `isAllowedOrigin` |
| `server/utils/validation.ts` | Add `therapistCreateSchema`, `therapistUpdateSchema`, `smsSendSchema` |
| `server/routes/patients.ts` | Import `getSingleQueryValue`, add whitelist, replace if-chains |
| `server/routes/expenses.ts` | Import `getSingleQueryValue`, add whitelist, replace if-chains |
| `server/routes/invoices.ts` | Import `getSingleQueryValue`, remove local definition |
| `server/routes/appointments.ts` | Import `getSingleQueryValue`, remove local definition |
| `server/routes/therapists.ts` | Add Zod validation for POST/PUT, remove inline validation |
| `server/routes/sms.ts` | Add Zod validation for `/send`, remove manual checks |

## Verification

- ✅ `npx tsc --noEmit` (frontend) — passes
- ✅ `npx tsc --noEmit -p tsconfig.server.json` (server) — passes