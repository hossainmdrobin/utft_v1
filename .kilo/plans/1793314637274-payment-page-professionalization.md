# Professionalize Member Payment Page

## Context

Member-facing payment page: `src/app/app/dashboard/payments/page.tsx` with cards in the same folder.
Current issues:
- `PaymentsPage` seeds state from mock `memberInstallments` instead of RTK Query data, so summary and totals disagree.
- Hardcoded `currentDate = new Date("2026-08-21...")` and hardcoded `৳`.
- Fine logic uses a fixed `FINE_PER_INSTALLMENT = 100` and applies on the due date, not after a delay.
- `getInstallmentStatus`/fine calculation do not use settings or `FineRule`.
- Filter buttons in `InstallmentHistoryCard` do not filter rows.
- "Pay installment of this month" button has no action.
- Loading/error/empty states are inconsistent.

Goal: make the page suitable for an association collecting monthly installments, with late-payment fines, using real backend data and Dhaka time.

## Decisions

- Data source: RTK Query `useGetInstallmentsQuery`/`useGetInstallmentQuery`; map MongoDB `Installment` docs to `InstallmentRecord`.
- Date: `getCurrentDhakaDate()`; no hardcoded date.
- Currency: `settings.currency_symbol` (fallback `৳`).
- Fine policy: fixed amount, grace period, cumulative frequency, and max cap. Source of truth order: active `FineRule` -> settings (`fine_enabled`, `amount`) -> fallback fixed 100 / grace 5 days / cumulative monthly.
- Fine applies only after grace period past due date (delayed installments), not on the due date.
- Status mapping: `transaction_id` (or `payment_status === "paid"`) => `PAID`, otherwise `UNPAID`.
- Overdue status: unpaid and past due date; fine applied only when days overdue > grace period.
- Fines are shown in total due and included in overdue installment payment amounts (phase 1 display + amount; persistence optional).

## Affected Boundaries

- `src/app/app/dashboard/payments/page.tsx`
- `src/app/app/dashboard/payments/installment-logic.ts`
- `src/app/app/dashboard/payments/installment-data.ts` (remove mock usage from page; keep types/constants)
- `src/app/app/dashboard/payments/due-installments-card.tsx`
- `src/app/app/dashboard/payments/advance-installments-card.tsx`
- `src/app/app/dashboard/payments/installment-history-card.tsx`
- `src/app/app/dashboard/payments/installment-logic.test.ts`
- Optional backend: `src/models/Installment.ts`, `src/app/api/aamarpay/callback/route.ts` for `payment_status`/`paid_at`

## Data Flow

1. Load settings, current user, installments, gateway transactions.
2. Map installments to records using month/year/day and default due day.
3. Compute current Dhaka date.
4. Compute statuses, summary, fines using policy.
5. Render cards; due card lets member select and pay; amount includes fines for overdue items.
6. On successful payment callback, installments gain transaction_id/payment_status and page refetches.

## Implementation Tasks (ordered)

1. Update `installment-logic.ts`:
   - Add `FinePolicy` type and parameters to `calculatePerInstallmentFine` and `calculateFinancialSummary`.
   - Fine applies only when overdue beyond grace; support fixed/percentage, cumulative daily/weekly/monthly, max cap.
   - Add `mapInstallmentToRecord(doc, defaultDueDay)` helper.
   - Keep `getInstallmentStatus` returning `OVERDUE` for past due (fine separately gated by grace).
2. Update `page.tsx`:
   - Remove mock state; derive records from query.
   - Use Dhaka date and settings currency.
   - Loading/error/empty states; wire current-month payment button.
   - Pass policy to summary and cards.
3. Update `due-installments-card.tsx`:
   - Show fine per item and include in selected total when overdue.
4. Update `installment-history-card.tsx`:
   - Apply `filter` to rows; keep badge variants.
5. Update tests:
   - Adjust fine expectations for grace period; add cumulative/cap cases.
6. Optional backend:
   - Add `payment_status`, `paid_at` to Installment model; set in callback.
   - Persist fine via `FineTransaction` when overdue (deferred if scope limited).

## Failure Modes

- No member id: skip queries, show sign-in/empty state.
- API failure: show error + retry; do not crash.
- Missing settings: fallback currency and disable fines.
- Timezone: all dates computed in Asia/Dhaka.
- Duplicate payment: rely on gateway transaction id; idempotent upsert in callback.

## Validation

- `npm run lint`
- `npx tsc --noEmit`
- Update/run installment logic tests (node test runner if available).

## Open Questions

- Fine amount source: prefer active `FineRule` (default 50, grace 5, cumulative monthly) or settings.amount (200)? Recommend FineRule with fallback 100.
- Should fines be payable separately or bundled into installment payments? Recommend bundled for overdue installments.
- Should fine persistence (`FineTransaction`) be included now or deferred? Recommend deferred to phase 2 if scope is page-only.
