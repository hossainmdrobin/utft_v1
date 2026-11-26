# Fix: Advance Installment Journal Entry Creation from User Profile

## Problem Analysis
When recording an advance monthly installment from a member profile (`/app/dashboard/members/[id]`), a journal entry should be created and balanced according to the debit and credit accounts configured in the Settings (`installmentAccounting`). However, no journal entry is currently created.

### Root Causes
1. **Mongoose `Model.create(doc, options)` signature error in `installmentPost.ts` and `transactions.ts`**:
   - In Mongoose, `Model.create(doc, { session })` does not treat the second argument as options; it treats `{ session }` as a second document to insert.
   - In `InstallmentModel.create(doc, { session })`, it returns `[doc1, doc2]`. Accessing `installmentDoc._id` yields `undefined`, corrupting `reference = String(installmentDoc._id)` to `"undefined"`.
   - In `JournalEntryModel.create({ ... }, session ? { session } : undefined)`, Mongoose tries to validate `{ session }` as a second `JournalEntry` document. Because `{ session }` lacks the required `date` field, Mongoose throws a `ValidationError` (`Path date is required`), aborting the creation.
2. **MongoDB Transactions unsupported on standalone deployments**:
   - `installmentPost.ts` requires a replica set via `session.withTransaction(...)`. In standalone MongoDB environments (common in local dev e.g. `mongodb://localhost:27017/utft`), `withTransaction()` throws `MongoServerError: Transaction numbers are only allowed on a replica set member or mongos`, causing the API to fail.
3. **Setting Lookup & Missing Account Defaults**:
   - `postInstallmentPayment` strictly requires `setting.installmentAccounting.debitAccount` and `creditAccount`. If the setting document is not yet configured or accounts are missing, it throws an error instead of gracefully falling back to standard default accounts (`1211` Cash at Bank as debit, `2101` Member Contributions Payable as credit) or auto-populating them.
4. **RTK Query Cache Invalidation**:
   - `manualInstallmentApi` (`api.installment.ts`) only invalidates `["INSTALLMENT"]`. It does not invalidate `["JournalEntries"]` or `["Accounts"]`, so the UI journal entries list and account balances do not refresh after advance payments.

---

## Proposed Changes

### 1. Robust Document Creation & Mongoose Session Handling
- **File**: `src/lib/accounting/transactions.ts`
  - Replace `JournalEntryModel.create({ ... }, session ? { session } : undefined)` with:
    ```ts
    const entryDoc = new JournalEntryModel({ ... });
    const entry = await entryDoc.save(session ? { session } : undefined);
    ```
  - Pass `session` correctly to `AccountModel.find({ ... }).session(session || null)` and `AccountModel.distinct(...)`.
- **File**: `src/lib/accounting/installmentPost.ts`
  - Replace `InstallmentModel.create({ ... }, { session })` with:
    ```ts
    const newInstallment = new InstallmentModel({ ... });
    installmentDoc = await newInstallment.save(session ? { session } : undefined);
    ```

### 2. Graceful Transaction Fallback for Standalone MongoDB
- **File**: `src/lib/accounting/installmentPost.ts`
  - Add an execution runner `runWithOptionalTransaction` that attempts `session.withTransaction(...)`.
  - If MongoDB throws that transactions are not supported on a standalone deployment, catch and fallback to executing the operations sequentially without a transaction session.
  - If running in a replica set (production / Atlas), it retains full ACID transactional guarantees.

### 3. Fetch Debit & Credit Accounts from Setting with Fallbacks
- **File**: `src/lib/accounting/installmentPost.ts`
  - Call `await seedAccounts()` to ensure default chart of accounts exists.
  - Query `Setting.findOne({}).sort({ created_at: 1 }).lean()`.
  - Check `setting?.installmentAccounting?.debitAccount` and `creditAccount`.
  - If present and valid (active, debit is `asset`, credit is `liability` or `equity`, debit != credit), use the accounts specified in the setting.
  - If not configured in the setting, retrieve default accounts (`1211` Cash at Bank and `2101` Member Contributions Payable), use them, and update `Setting` with `installmentAccounting` so subsequent operations are permanently linked.

### 4. Cache Invalidation in RTK Query Slice
- **File**: `src/store/slices/installmentSlice/api.installment.ts`
  - Add `"JournalEntries"` and `"Accounts"` to `invalidatesTags` for both `createManualInstallment` and `actionOnInstallment`.

---

## Verification Plan

1. **Type Checking & Linting**:
   - Run `npx tsc --noEmit` and verify 0 type errors.
   - Run `npx eslint src/lib/accounting/installmentPost.ts src/lib/accounting/transactions.ts src/store/slices/installmentSlice/api.installment.ts`.
2. **Advance Installment Creation Flow**:
   - Simulate/test calling `POST /api/installments/manual` with `{ member: "<memberId>", data: [{ month, year, day, amount, payment_status: "paid", status: "advance" }] }`.
   - Verify installment document is created with `payment_status: "paid"`.
   - Verify corresponding `JournalEntry` is created with:
     - `reference`: matches installment `_id`.
     - Lines: Debit to setting's debit account (asset), Credit to setting's credit account (liability/equity).
     - Account balances updated accordingly.
3. **Settings Dynamic Mapping**:
   - Verify changing `installmentAccounting` debit/credit in Settings alters the accounts used for newly recorded advance installments.
