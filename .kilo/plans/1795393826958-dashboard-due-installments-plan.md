# Dashboard Due Installments Count

## Goal

Add two stat cards to the admin `Dashboard.tsx` showing:
- **Due This Month**: count of unpaid installments for the current Dhaka calendar month/year.
- **Due (All Time)**: count of all unpaid installments regardless of period.

## Decisions

- **Scope:** Admin `Dashboard.tsx` only. `MemberDashboard.tsx` is out of scope.
- **"Unpaid" definition:** An installment is unpaid unless it has any paid marker. Use the same three-marker check already established in `installment-logic.ts:262` and `MemberInstallmentsSection.tsx:65`:
  - `payment_status === "paid"`, OR
  - `String(status).toLowerCase() === "paid"`, OR
  - `Boolean(transaction_id)`.
- **"This month":** `installment.year === currentDhaka.year && installment.month === currentDhaka.month` (calendar-month match; no day/due-day heuristic). Use `getCurrentDhakaDate()` from `src/lib/date/dhaka.ts`.
- **"All time":** Every unpaid installment in the bulk `useGetInstallmentsQuery()` result.
- **Data source:** Reuse the existing `useGetInstallmentsQuery()` call already in `Dashboard.tsx:19`. No new endpoint, no new RTK tag. The bulk endpoint `/app/dashboard/payments/api` returns all installments unpaginated.
- **Member normalization:** Not needed for these counts (trust-wide totals, not per-member grouping). Count installments directly.
- **Loading/error:** Reuse the existing `statsLoading` pattern. Include `installmentsLoading` in the loading state for the two new cards. On installment query error, render `—` (em dash) for both counts rather than a false zero. Add `isError` from the existing `useGetInstallmentsQuery()` call.

## Implementation Tasks

1. **Edit `src/app/app/dashboard/Dashboard.tsx`**
   - Extend the existing `useGetInstallmentsQuery()` destructure (line 19) to also pull `isError: installmentsError`.
   - Add `getCurrentDhakaDate` to the existing `@/lib/date/dhaka` import (currently `{ monthArray }` at line 12).
   - Add a small local helper `isUnpaid(installment)` implementing the three-marker check above (mirror `installment-logic.ts:262`).
   - Compute:
     - `const currentDhaka = getCurrentDhakaDate();`
     - `const allInstallments = installmentsData?.data ?? [];`
     - `const unpaidAll = allInstallments.filter(isUnpaid).length;`
     - `const unpaidThisMonth = allInstallments.filter((i) => !isUnpaid(i) ? false : Number(i.year) === currentDhaka.year && Number(i.month) === currentDhaka.month).length;`
   - Add two entries to the `statsCards` array (lines 48-77):
     - `{ title: "Due This Month", value: installmentsLoading ? "..." : installmentsError ? "—" : unpaidThisMonth.toString(), change: "", icon: Clock, color: "text-orange-500" }`
     - `{ title: "Due (All Time)", value: installmentsLoading ? "..." : installmentsError ? "—" : unpaidAll.toString(), change: "", icon: Clock, color: "text-red-500" }`
     - `Clock` is already imported (line 4).
   - Update `statsLoading` (line 31) to include `installmentsLoading` so all cards share one loading gate, OR leave `statsLoading` as-is and rely on the per-card `installmentsLoading` check in `value`. **Choose the per-card approach** (do not change `statsLoading`) so member/share cards are unaffected by installment loading.
   - The grid at line 98 is `lg:grid-cols-4`; with 6 cards now, change to `lg:grid-cols-3` (2 rows of 3) or keep `lg:grid-cols-4` and let the 2 new cards wrap. **Recommend `lg:grid-cols-3`** for balanced layout.

2. **No other files change.** No new endpoint, no RTK tag, no model change.

## Edge Cases & Failure Handling

- **Installment query error:** both new cards show `—`, not `0`.
- **No installments:** both counts are `0`.
- **Paid markers mixed:** an installment with `payment_status: "paid"` but `status: "due"` is paid (first marker wins). Same for `transaction_id` present.
- **Member field forms (string/ObjectId/populated object):** irrelevant to counts; no grouping needed.
- **Future/advance unpaid installments:** counted in "All Time" (per decision). For "This Month", only counted if their `year`/`month` match the current Dhaka month (advance records for future months will not match).
- **Timezone:** use `getCurrentDhakaDate()` so month/year match the cron's seeding logic (`createMonthlyInstallments.ts` uses the same helper).

## Validation

1. `npx tsc --noEmit` passes.
2. `npm run lint` on `Dashboard.tsx` shows no new errors (pre-existing repo-wide `no-explicit-any` etc. are out of scope).
3. With `share_value` etc. configured and the cron having run for the current month, an admin viewing `/app/dashboard` sees:
   - "Due This Month" = number of unpaid installments whose `year`/`month` match current Dhaka month.
   - "Due (All Time)" = total unpaid installments across all periods.
4. Marking an installment paid (manual or AamarPay callback) and refetching/reloading reduces both counts by 1 if that installment matched "this month", or only reduces "All Time" if it was for a different month.
5. Pending/rejected/inactive members' unpaid installments still count (trust-wide totals; no stage filter applied — this matches the "all unpaid" decision and the bulk endpoint behavior).

## Notes

- This is trust-wide. If per-member due counts are later needed, that would be a separate aggregation (similar to the member-receivables `Map<string, number>` pattern already implemented in `Members.tsx`).
- The AamarPay callback does not invalidate RTK Query; after an external payment the dashboard may need a manual reload to reflect new counts. This is a pre-existing gap and out of scope here.