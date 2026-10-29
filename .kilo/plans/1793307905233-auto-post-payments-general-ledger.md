# Auto-Post Payments to General Ledger — Implementation Plan

**Goal:** Every member payment (installment, share, fine, donation, charge) automatically generates balanced double-entry journal entries, so the books are complete, auditable, and ready for later investment tracking. No new investment logic — foundation only.

**Status:** Planning complete. Ready for implementation.

---

## Decisions Resolved (Q1–Q5)

**Q1.** Post journal entries only on actual payment received. No receivables created at due-time; `Installment` model keeps due-date/payment-status tracking.

**Q2.** Default chart of accounts seeded once (idempotent). Contributions/shares = liability/equity (member funds in trust), NOT association income. Fines/donations = income.

**Q3.** Seed once on initialization; idempotent (no duplicates). Admins can add accounts. Accounts with posted journal entries cannot be deleted; code/type immutable once posted (only name/description editable).

**Q4.** Shared service `src/lib/accounting/autoPost.ts` exporting `postPayment(...)`, wrapping existing `createTransaction` (balance validation, account balance updates, audit log). Hook-in points: installments (AamarPay callback), shares (`MarkAsPaidDialog`), fines/donations/charges (`RecordPaymentDialog`). New Next.js API Routes expose `postPayment`. All accounting server-side — no client-side Supabase journal entry writes.

**Q5.**
- Seeded accounts: `1211` Cash at Bank (Asset), `1222` Shares Receivable (Asset — backward compat only), `2101` Member Contributions Payable (Liability), `3101` Share Capital (Equity), `4101` Fine Income (Income), `4102` Donation Income (Income).
- Order: journal entry created first, then source record updated. Safely retryable — retry detects existing entry and completes source update without duplicating.
- Idempotency key: `${sourceType}:${sourceId}:${paymentReference || amount.toFixed(2}):${YYYY-MM-DD}`. Installments use AamarPay `transaction_id` as paymentReference.

---

## Accounting Mappings (Dr / Cr)

| Transaction | Debit | Credit | Notes |
|---|---|---|---|
| Installment/contribution paid | `1211` Cash at Bank | `2101` Member Contributions Payable | Member funds held in trust, not income |
| Share payment | `1211` Cash at Bank | `3101` Share Capital | Equity; going forward (existing entries to `1222` preserved) |
| Fine paid | `1211` Cash at Bank | `4101` Fine Income | Genuine income |
| Donation paid | `1211` Cash at Bank | `4102` Donation Income | Genuine income |
| Charge paid | `1211` Cash at Bank | `2101` Member Contributions Payable | Overridable via `lines` |

Each entry must balance (total debit = total credit). Amount field tolerance `0.005` per existing `createTransaction`.

---

## Affected Files

### New files
1. `src/lib/accounting/autoPost.ts` — `postPayment()` service
2. `src/lib/accounting/seedAccounts.ts` — idempotent seed of default chart of accounts
3. `src/app/app/dashboard/payments/api/post-payment/route.ts` — API route exposing `postPayment`
4. `.kilo/plans/1793307905233-auto-post-payments-general-ledger.md` — this plan

### Modified files
5. `src/app/api/aamarpay/callback/route.ts` — call `postPayment` after GatewayTransaction created for installments
6. `src/components/shares/MarkAsPaidDialog.tsx` — replace client-side supabase journal-entry code with API call to `postPayment`; credit `3101` going forward
7. `src/components/members/RecordPaymentDialog.tsx` — call `postPayment` API on successful payment for donation/charge/fine
8. `src/lib/accounting/transactions.ts` — may need small tweak to surface account balance updates consistently (review only, minimal change)
9. `src/app/app/dashboard/accounting/api/route.ts` or `src/app/api/accounting/accounts/route.ts` — enforce delete/edit protection on accounts with posted entries (review)

### Review-only (no change expected unless gaps found)
- `src/app/api/accounting/transactions/route.ts` and `[id]/route.ts`
- `src/app/app/dashboard/accounting/api/journalEntry/`
- `src/store/slices/paymentSlice/`, `accountSlice/`, `journalEntrySlice/`
- `src/models/Account.ts`, `src/models/JournalEntry.ts`
- `src/integrations/mongodb/models/AuditLog.ts`

---

## `postPayment` Service Specification

**Signature:**
```ts
postPayment({
  sourceType: "installment" | "share" | "fine" | "donation" | "charge",
  sourceId: string,
  paymentReference?: string,       // AamarPay transaction_id for installments; payment record ID otherwise
  memberId: string,
  paymentDate: Date | string,
  amount: number,
  description: string,
  user: { _id, full_name, user_id, role }, // who posted
  lines?: Array<{ accountId, debit, credit, description }>, // override default mapping
}): Promise<{ journalEntry, isDuplicate: boolean }>
```

**Behavior:**
1. Validate: source record exists, amount > 0, member matches source, user authorized, payment date valid.
2. Build idempotency key: `${sourceType}:${sourceId}:${paymentReference || amount.toFixed(2)}:${YYYY-MM-DD}` (UTC Dhaka date).
3. Check `JournalEntry.findOne({ reference: idempotencyKey, status: "posted" })`. If found → return existing entry with `isDuplicate: true` (do not create).
4. Build default 2-line mapping per source type unless `lines` override provided.
5. Call existing `createTransaction({ lines, status: "posted", reference: idempotencyKey, member, description, date: paymentDate, created_by: user })`.
6. Return `{ journalEntry, isDuplicate: false }`.

**Error handling:** Throw descriptive errors; caller decides retry semantics.

---

## Hook-In Implementations

### 1. Installments — AamarPay callback (`src/app/api/aamarpay/callback/route.ts`)
- After successful payment status and after `GatewayTransaction.create(...)`, call `postPayment({ sourceType: "installment", sourceId: savedInstallment._id, paymentReference: transaction_id, ... })`.
- Wrap in try/catch; log but do not block the redirect (payment already recorded; journal entry can be retried).
- Reference key uses `transaction_id` (unique per payment) — retries won't duplicate.

### 2. Shares — `MarkAsPaidDialog.tsx`
- Remove the inline `createJournalEntry` supabase code (it writes journal entries client-side, violating server-side rule).
- On successful share-receivable update, call `POST /api/app/dashboard/payments/api/post-payment` with `sourceType: "share"`, `sourceId: receivable.id`, `paymentReference: receivable.id` (or a payment record ID if available), `lines` override crediting `3101` Share Capital.
- If API fails, show error but keep the payment recorded (journal entry retryable).

### 3. Fines / Donations / Charges — `RecordPaymentDialog.tsx`
- On successful payment update, call `postPayment` API.
- `fine` → credit `4101` Fine Income; `donation` → credit `4102` Donation Income; `charge` → credit `2101` Member Contributions Payable (default mapping).
- Same retry-safe pattern.

---

## Migration & Backward Compatibility

- Existing journal entries (from `MarkAsPaidDialog` supabase writes referencing `1211`/`1222`) are preserved untouched. Do not modify or delete.
- Seed checks for existing accounts by code before inserting — idempotent, no duplicates.
- Going forward share payments credit `3101`; historical entries to `1222` remain valid references.
- No data migration script needed; seed runs on first app initialization.

---

## Validation & Safeguards

1. **Balance validation** — reuse existing `createTransaction` check (total debit = total credit within `0.005`).
2. **Idempotency** — reference-key lookup prevents duplicate journal entries on retry; partial payments with different amounts create separate entries.
3. **Account protection** — DELETE blocked if `JournalEntryLine`/`JournalEntry` references account; PATCH blocked from changing `code`/`type` if posted entries exist (only `name`/`description` editable).
4. **Posted-entry immutability** — journal entries with `status: "posted"` cannot be edited/deleted through normal UI; only void/reverse via new correcting entry.
5. **Server-side only** — all `postPayment` calls go through Next.js API routes with `getCurrentMember` authorization; client components never write journal entries directly.
6. **Retry safety** — journal entry created first; source update second. Retry detects existing entry via idempotency key and completes source update.

---

## Implementation Order

1. Create `src/lib/accounting/seedAccounts.ts` and run seed (verify idempotency).
2. Create `src/lib/accounting/autoPost.ts` with `postPayment`.
3. Create API route `src/app/app/dashboard/payments/api/post-payment/route.ts`.
4. Wire `postPayment` into AamarPay callback route (installments).
5. Update `MarkAsPaidDialog` (shares) — remove client-side journal entry code, add API call.
6. Update `RecordPaymentDialog` (fines/donations/charges).
7. Add account delete/edit protection to account routes.
8. Run `npm run lint` and `npx tsc --noEmit`; verify existing tests still pass (`src/app/app/dashboard/payments/installment-logic.test.ts`).
9. Manual end-to-end check: make a payment, confirm journal entry appears in ledger, retry confirms no duplicate.

---

## Validation Steps

- `npm run lint` — no new ESLint errors
- `npx tsc --noEmit` — no type errors
- Existing installment-logic test still passes
- Manual: installment payment via AamarPay callback → journal entry in ledger with correct Dr/Cr
- Manual: share payment → credit `3101`, not `1222` (new entries)
- Manual: retry same payment → no duplicate journal entry
- Manual: attempt to delete account with posted entries → blocked

---

## Open Questions (none blocking)
- None. All design decisions Q1–Q5 resolved. Plan is implementation-ready.
