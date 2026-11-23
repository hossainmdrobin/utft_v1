# Plan: Automatic Installment Journal Entry with MongoDB Transactions

## Goal
Post a balanced journal entry (debit installment debit account / credit installment credit account) automatically when an Installment is created with `payment_status: "paid"` or changes from `unpaid` to `paid`, all inside a mandatory MongoDB transaction, with idempotency by installment ID.

## Architecture findings (already inspected)
- `src/models/Account.ts` — `code, name, type (asset|liability|equity|income|expense), balance, isActive, parentAccount`.
- `src/models/Installment.ts` — `payment_status (unpaid|paid), amount, member, created_by, date`; index `{member, month, year}` unique sparse.
- `src/models/JournalEntry.ts` — embedded `lines[] (account, debit, credit)`, `reference`, `member`, `description`, `status (draft|posted|void)`, `created_by`, `actioned_by`. Lines are embedded (NOT standalone `JournalEntryLine`).
- `src/models/JournalEntryLine.ts` — standalone model, NOT used by `createTransaction`; existing accounting posts embedded lines only.
- `src/integrations/mongodb/models/Setting.ts` — `installmentAccounting.debitAccount` / `creditAccount` (ObjectId refs to Account).
- `src/app/app/dashboard/settings/api/route.ts` — already validates: debit=active asset, credit=active liability/equity, debit != credit, both exist. Reuse this validation.
- `src/lib/accounting/autoPost.ts` — `postPayment()` (NON-transactional; composite idempotency key `${sourceType}:${sourceId}:${ref}:${dateStr}`; used by post-payment route for donation/charge/fine/shares). Leave unchanged (do not modify unrelated workflows).
- `src/lib/accounting/transactions.ts` — `createTransaction()` creates JournalEntry with embedded lines, validates debit==credit, updates `Account.balance` via `balanceDelta`, creates AuditLog. NO session support; no `connectDB`-free path.
- `src/integrations/mongodb/connection.ts` — exports `mongoose` and `connectDB()`.
- Entry points used by UI (`MemberInstallmentsSection`):
  - `POST /api/installments/manual` (createManualInstallment) — route handler MISSING.
  - `POST /api/installments/manual/:id` (actionOnInstallment) — route handler MISSING.
  - `POST /app/dashboard/payments/api/post-payment` — exists; NOT used by installment UI; leave unchanged.
- No existing `startSession`/`withTransaction` usage anywhere.

## Decisions
1. New transactional service: `src/lib/accounting/installmentPost.ts`, export `postInstallmentPayment(input)`.
2. Entry points: create both missing route handlers (`src/app/app/api/installments/manual/route.ts` and `src/app/app/api/installments/manual/[id]/route.ts` under the existing `src/app/app` convention; adjust path to match app router) that call `postInstallmentPayment`.
3. Reuse `createTransaction` but add optional `session` param so writes pass `{ session }`; `postInstallmentPayment` may also write inline with `{ session }`. Backward-compatible.
4. Journal lines: embedded lines in `JournalEntry` (match existing `createTransaction` architecture). Do NOT create standalone `JournalEntryLine` records (unused by existing posting path).
5. Idempotency: `JournalEntry.findOne({ reference: installmentIdString, status: "posted" })` inside transaction; if exists, return it as duplicate and do not re-post; still treat installment as paid (posting already succeeded previously).
6. `reference` = installment `_id` (task: installment ID as unique reference).
7. Amount = installment `amount`; debit account = configured debit account; credit account = configured credit account.
8. Validate settings + accounts inside transaction (active, correct types, debit != credit); reject if missing/invalid.
9. Mark installment paid ONLY after journal posting succeeds within the same transaction; unpaid installments never post.
10. `mongoose.startSession()` + `session.withTransaction()`; pass `{ session }` to every write; `session.endSession()` in `finally`; no external API calls inside callback; no silent fallback to non-transactional writes.
11. Bulk manual create: post each paid installment in its own transaction; fail fast (first failure aborts, prior committed per-installment transactions remain — documented tradeoff).

## Files
- Create: `src/lib/accounting/installmentPost.ts`
- Edit: `src/lib/accounting/transactions.ts` (add optional `session` param to `createTransaction`, pass to writes)
- Create: `src/app/app/api/installments/manual/route.ts` (POST create)
- Create: `src/app/app/api/installments/manual/[id]/route.ts` (POST mark paid)

## Implementation steps
1. Add optional `session` param to `createTransaction(data, user, session)`; pass `{ session }` to `JournalEntryModel.create` and `AccountModel.findByIdAndUpdate` when present.
2. Create `installmentPost.ts`:
   - `connectDB()`; `const session = await mongoose.startSession()`.
   - `await session.withTransaction(async () => {
       fetch Setting (lean, session); validate installmentAccounting present; fetch debit+credit Account (session); validate exist/active/types/debit!=credit;
       idempotency check `JournalEntry.findOne({ reference: installmentId, status: "posted" }).session(session)`; if found return duplicate;
       if create: `InstallmentModel.create({... payment_status:"paid", paid_at}, { session })`;
       if update: verify current `payment_status !== "paid"`, then `findByIdAndUpdate(id, {payment_status:"paid", paid_at}, { session, new: true })`;
       build lines = [{account:debitId, debit:amount, credit:0}, {account:creditId, debit:0, credit:amount}];
       `JournalEntryModel.create({date, reference: installmentId, member, description, lines, status:"posted", created_by, actioned_by}, { session })`;
       update account balances: debit `+amount`, credit `-amount` via `findByIdAndUpdate(..., { $inc: { balance: delta } }, { session })` using `balanceDelta` logic;
     })`;
   - `finally { await session.endSession() }`; return `{ journalEntry, isDuplicate }`.
3. Create route handlers (auth via `getCurrentMember`, connectDB, parse body, call `postInstallmentPayment`, return `{data: {journalEntry, isDuplicate}}`).
4. Run `npm run lint` and `npx tsc --noEmit`.

## Validation
- Lint + typecheck pass.
- Successful balanced journal posting (debit total == credit total) for new paid installment and unpaid→paid transition.
- Duplicate prevention: second post for same installment ID returns existing entry, no duplicate JE.
- Account config validation: missing/inactive/wrong-type settings rejected; transaction aborts, no installment/JE/balance partial remains.
- Rollback: force a failure mid-transaction; verify no installment, JE, or balance change persists.
- Unpaid installment creation does not post.

## Out of scope
- Modifying `post-payment` route or `autoPost.postPayment` (used by donation/charge/fine/shares).
- Standalone `JournalEntryLine` records.
- AamarPay/cron/payment-gateway flows.
- Tests: no test runner configured; validate via lint/tsc and manual verification (or add a runner only if required).
