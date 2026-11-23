# Member Receivables

## Goal

Show each member's receivable in the member list using the existing member, settings, and installment APIs:

`receivable = approved member share_quantity * settings.share_value * unpaid installment count`

The member list must remain unchanged in scope: pending, inactive, rejected, and other non-approved rows remain visible, but their receivable is `0` and their derived payment status is `Cleared`.

## Decisions

- **Due installment definition:** every installment record that is not paid, including unpaid future/advance records. Do not use due-date heuristics for this task.
- **Paid markers:** an installment is paid when `payment_status === "paid"`, `status` is case-insensitively `"paid"`, or `transaction_id` is truthy. This matches the existing payment/member-detail behavior.
- **Data source:** fetch all installments once with the existing bulk `useGetInstallmentsQuery()` from `src/store/slices/paymentSlice/api.slice.ts`; do not call the per-member endpoint for every table row.
- **Grouping:** normalize each installment member reference before grouping. Existing data can contain a populated `member` object, an ObjectId string, or an ObjectId value, so use `_id`, `member._id`, or `member` and compare IDs as strings.
- **Approved scope:** only count installments for members whose `stage === "approved"`. Non-approved members retain all displayed member data but get zero receivable and Cleared status.
- **Payment status:** derive `due` when an approved member has at least one unpaid installment, otherwise `cleared`. Keep the existing `PaymentStatusBadge` component and its current cleared behavior (which renders no badge for cleared).
- **Currency display:** use settings `currency_symbol`, `currency_decimal_places`, and `currency_position`; default to `৳`, `2`, and `before` when absent. This follows the settings UI rather than hard-coding a symbol/decimal format in the table.
- **Amount source:** use configured `share_value` for the requested formula, not each installment's stored `amount` or `default_contribution_amount`.

## Implementation Tasks

1. **Update `src/store/slices/paymentSlice/api.slice.ts`**
   - Extend the installment response type with `payment_status?: string`.
   - Broaden `member` from the current populated-object-only type to the actual union used by existing data: `{ _id: string; profile_photo?: string; full_name?: string } | string | { [key: string]: any } | undefined`.
   - Keep the existing `getInstallments` endpoint URL, query parameters, and `{ data, count }` response shape unchanged.
   - Do not add a new endpoint unless the implementation discovers that this existing type cannot safely represent current production data.

2. **Update `src/app/app/dashboard/members/Members.tsx`**
   - Import `useGetSettingsQuery` and `useGetInstallmentsQuery`.
   - Fetch settings and all installments alongside the existing members query.
   - Use a small local helper to determine whether an installment is paid using the three paid markers above.
   - Build a `Map<string, number>` keyed by normalized member ID, containing the count of unpaid installments for every member. Approval filtering and receivable calculation happen in the table row so non-approved members can still be explicitly forced to zero.
   - Pass the derived per-member unpaid-count map, settings, and installment query loading/error state to `MembersTable`.
   - Include settings loading and installment loading in the existing loading condition so rows do not render misleading zero amounts while dependencies are pending.
   - Remove the unused `receivables` state from its current empty initialization.
   - If settings or installments fail, retain existing query conventions and prevent financial columns from claiming false precision: render `--` for receivable and render no due/cleared badge when the installment aggregate is unavailable.

3. **Update `src/components/members/MembersTable.tsx`**
   - Change the `receivables` prop to the derived unpaid-count map keyed by member ID.
   - Add settings/currency props or a prepared formatter from `Members.tsx`.
   - For each row:
     - Determine the member ID as `member._id ?? member.id`.
     - Look up the member's unpaid installment count.
     - Force `unpaidCount` to `0` when `member.stage !== "approved"`.
     - Display `share_quantity` as before.
     - Calculate `Number(member.share_quantity || 0) * shareValue * unpaidCount`.
     - Render the receivable amount with the configured currency symbol, decimal places, and position.
     - Render `PaymentStatusBadge` with `due` when the effective unpaid count is positive, otherwise `cleared`.
   - Keep all existing columns, member actions, links, filters, and layout unchanged.
   - If installment data is unavailable due to an error, display `--` for receivable and do not render a due/cleared badge, so unknown installment data is not presented as a zero balance.

4. **Preserve existing endpoint behavior and cache behavior**
   - Do not change `/app/dashboard/members/api`, `/app/dashboard/settings/api`, or `/app/dashboard/payments/api`.
   - Ensure any installment mutation that already invalidates `"INSTALLMENT"` continues to refresh the bulk query used by this page.
   - If manual installment changes do not already invalidate the bulk query, add the appropriate tag invalidation in the existing installment mutation rather than introducing a second cache.
   - Do not change installment generation, payment callbacks, stored installment amounts, or share settings semantics.

## Edge Cases and Failure Handling

- Missing, null, non-numeric, or negative share quantity: treat as `0` for receivable calculation.
- Missing or invalid share value: treat as `0`; display the formatted zero amount rather than `NaN`.
- No installment records: approved member receivable is `0`; payment status is `cleared`.
- Unpaid current/future/advance installment: count it as due.
- Paid installment with only a legacy/alternate status marker: exclude it from unpaid count when the existing paid-marker helper identifies it as paid.
- Installment member reference is an object, ObjectId, or string: normalize before grouping.
- Members have no `_id`/`id`: skip derived lookup for that row rather than crashing; this should be a defensive fallback because existing rows normally have `_id`.
- Multiple member rows sharing the same ID: each row uses the same derived installment aggregate, but no mutation of member data occurs.
- Settings and installment queries loading: show the existing skeleton/loading UI.
- Installment query error: display `--` for receivable and omit the due/cleared badge rather than presenting a false zero or Cleared state.
- Settings query error: use documented defaults (`৳`, `2`, `before`, share value `0`) and avoid introducing a new blocking screen unrelated to this focused change.
- Share value changes: settings query refresh/reload must recalculate all displayed receivables because the calculation uses current settings, not stored installment amounts.
- Member filter changes: the installment fetch is all-member bulk data; filtered member rows use the same grouped aggregate.

## Validation

1. Run `npx tsc --noEmit`.
2. Run `npm run lint` and separate any pre-existing repository failures from issues in the touched files.
3. Verify a member with `stage: "approved"`, `share_quantity: 3`, settings `share_value: 1000`, and two unpaid installments displays `৳3000.00`.
4. Verify changing the same member to one paid installment and one unpaid installment displays `৳1500.00` and `Due`.
5. Verify an approved member with all installments paid displays `৳0.00` and no Cleared badge, matching `PaymentStatusBadge` behavior.
6. Verify a pending/rejected/inactive member remains listed, displays zero receivable, and is treated as Cleared even if unpaid installment records exist.
7. Verify installment member IDs in populated-object, string, and ObjectId forms all group to the correct member.
8. Verify unpaid future/advance installments are counted.
9. Verify currency symbol, decimal places, and before/after position from settings affect the receivable display.
10. Verify changing the configured share value recalculates receivables after settings refresh/reload.
11. Verify member filters and admin actions remain unchanged.
12. Verify installment changes refresh the bulk installment query and the member list reflects the updated count without requiring a manual page reload.
