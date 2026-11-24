# Plan: Consolidate Journal Entry and Transaction Accounting Routes

## Problem Analysis

The codebase currently has confusion between "Journal Entry" and "Transaction":
1. **Conceptual overlap**: The database model is `JournalEntry` (`src/models/JournalEntry.ts`). There is no separate accounting `Transaction` model. In double-entry bookkeeping, an accounting transaction *is* a journal entry. The business logic file is `src/lib/accounting/transactions.ts`, and the Redux slice is `src/store/slices/journalEntrySlice/api.journalEntry.ts`.
2. **Duplicate/orphaned API routes**:
   - **Canonical active routes**:
     - `src/app/api/accounting/transactions/route.ts` (GET list, POST create)
     - `src/app/api/accounting/transactions/[id]/route.ts` (GET by ID, PATCH update, DELETE delete)
     - Called directly by the frontend RTK slice `api.journalEntry.ts`.
   - **Orphaned duplicate routes** in `src/app/app/dashboard/accounting/api/`:
     - `journalEntry/route.ts` (duplicate of `transactions/route.ts`)
     - `journalEntry/[id]/route.ts` (incomplete duplicate of `transactions/[id]/route.ts`, missing DELETE and `actioned_by` population)
     - `route.ts` (duplicate of `src/app/api/accounting/accounts/route.ts`)
     - `entry_line/route.ts` (dead route querying standalone `JournalEntryLine` model; called only by an unimported slice `api.entryLine.ts`)

The active frontend uses `/api/accounting/transactions`. The entire `src/app/app/dashboard/accounting/api/` folder is legacy dead code created before API routes were consolidated under `src/app/api/accounting/`.

---

## Decisions

1. **Keep Canonical Route Path**: Keep `/api/accounting/transactions` and `/api/accounting/transactions/:id` as the single canonical API path for journal entry CRUD.
   - Reason: It is already the endpoint wired into `src/store/slices/journalEntrySlice/api.journalEntry.ts` and called by all accounting UI components (`JournalEntriesTable`, `JournalEntriesList`, `JournalEntryDialog`, `JournalEntryDetail`, `FinancialReports`, etc.).
2. **Delete Orphaned Dashboard Accounting Routes**:
   - Delete `src/app/app/dashboard/accounting/api/journalEntry/route.ts`
   - Delete `src/app/app/dashboard/accounting/api/journalEntry/[id]/route.ts`
   - Delete `src/app/app/dashboard/accounting/api/route.ts` (orphaned accounts CRUD)
   - Delete `src/app/app/dashboard/accounting/api/entry_line/route.ts` (orphaned entry line query)
   - Delete `src/store/slices/entryLineSlice/api.entryLine.ts` (unused RTK slice)
3. **Enhance Canonical Route with Query Aliases**:
   - In `src/app/api/accounting/transactions/route.ts`, add fallback support for snake_case query params (`date_from`, `date_to`, `member_id`) present in the deleted duplicate route, ensuring backward compatibility.
4. **Clarify Terminology with Code Comments**:
   - In `src/lib/accounting/transactions.ts` and `src/models/JournalEntry.ts`, add concise JSDoc explaining that "transactions" in the accounting domain are double-entry `JournalEntry` records.

---

## Proposed Changes

### 1. Enhance Canonical Route
**File:** `src/app/api/accounting/transactions/route.ts`
- Support parameter aliases:
  ```ts
  const dateFrom = searchParams.get("dateFrom") || searchParams.get("date_from");
  const dateTo = searchParams.get("dateTo") || searchParams.get("date_to");
  const member = searchParams.get("member") || searchParams.get("member_id");
  ```

### 2. Delete Dead / Duplicate Routes
Remove the following files:
- `src/app/app/dashboard/accounting/api/journalEntry/route.ts`
- `src/app/app/dashboard/accounting/api/journalEntry/[id]/route.ts`
- `src/app/app/dashboard/accounting/api/route.ts`
- `src/app/app/dashboard/accounting/api/entry_line/route.ts`
- `src/store/slices/entryLineSlice/api.entryLine.ts`

### 3. Add JSDoc Clarification
**File:** `src/lib/accounting/transactions.ts`
- Add a top-level comment:
  ```ts
  /**
   * Accounting Transaction Service
   * In this system, double-entry financial transactions are recorded as JournalEntry documents.
   * "Transaction" and "JournalEntry" refer to the same underlying accounting ledger records.
   */
  ```

---

## Verification Plan

1. **Type Checking**:
   - Run `npx tsc --noEmit` to verify no broken imports or missing type references exist after file deletions.
2. **Linting Check**:
   - Verify ESLint has no new errors on changed files.
3. **Route Check**:
   - Verify `src/app/api/accounting/transactions` handles GET, POST.
   - Verify `src/app/api/accounting/transactions/[id]` handles GET, PATCH, DELETE.
   - Confirm no lingering imports of `entryLineApi` or `entryLineSlice`.
