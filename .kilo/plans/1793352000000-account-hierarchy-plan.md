# Account Hierarchy (Parent/Child) Plan

**Goal:** Implement QuickBooks-style parent/child account hierarchy on top of the existing account feature.
**Owner:** implementation-capable agent (this agent plans only; no source edits here).
**Plan file:** `.kilo/plans/1793352000000-account-hierarchy-plan.md`

---

## Current state (verified on disk)

- `src/models/Account.ts` — `IAccount` already has `parentAccount?: Schema.Types.ObjectId` (ref `Account`). No validation (no cycle/self-parent/missing-parent checks).
- `src/lib/accounting/accounts.ts` — `getAccounts/createAccount/updateAccount/deleteAccount` accept/pass `parentAccount`, but no validation, no tree fetch, no rollup, no child-exists guard on delete.
- `src/app/api/accounting/accounts/route.ts` and `src/app/app/dashboard/accounting/api/route.ts` — flat GET/POST/PATCH/DELETE; no `?tree` support.
- `src/store/slices/accountSlice/api.account.ts` — RTK Query; `getAccounts` has no `tree` param.
- `src/components/accounting/AccountsList.tsx` — `buildTree()` already nests children by `parentAccount` and renders indented collapsible rows. Hides balance/type for parent rows.
- `src/components/accounting/CreateAccountFormFields.tsx` — `parentAccount` is a free-text input (not a selector).
- `src/lib/accounting/transactions.ts` — `createTransaction` increments `account.balance` per posted line; no leaf-only check.
- `src/lib/accounting/seedAccounts.ts` — flat `DEFAULT_ACCOUNTS` only.

## Resolved design decisions

| Decision | Resolution |
|---|---|
| Can parents be posted to directly? | **No.** Only leaf accounts (no children) may receive journal postings. Parents are rollup containers. |
| Delete account with children? | **Block** deletion; require children to be moved/deleted first. |
| Rollup balance computation? | **On-the-fly aggregation** (sum descendant leaf balances at read time). No stored parent balance, no drift risk. |
| Reparenting scope? | Moving an account moves its whole subtree (natural tree semantics). |
| Chart of Accounts shape? | Keep **type-grouped trees** (current behavior): each type group renders its own hierarchy tree. |

## Tasks (in order)

### 1. Model validation — `src/models/Account.ts`
Add:
- `pre("save)` middleware: reject self-parenting, circular parent references, and missing parent account.
- Static `Account.validateParent(accountId, parentId)`: reusable check for create/update/reparent (rejects cycles, self-parent, missing parent).

### 2. Service layer — `src/lib/accounting/accounts.ts`
- `getAccounts(filters)`: add `tree?: boolean`. When `tree: true`, return nested tree (`data` = roots with `children`) instead of flat list; keep `{ data, count }` shape.
- `createAccount`: call `Account.validateParent` on `parentAccount`; reject posting-relevant invalid parents.
- `updateAccount`: when `parentAccount` changes, call `Account.validateParent(id, newParentId)`; reject if target has children being reparented into a descendant (cycle).
- `deleteAccount`: block if account has children (`Account.exists({ parentAccount: id })`) with a clear error.
- Add helper `getRollupBalance(accountId)`: sum balances of all descendant leaf accounts via recursive child lookup + aggregation (or a single aggregation with `$graphLookup`).

### 3. Transaction posting guard — `src/lib/accounting/transactions.ts`
In `createTransaction`, before incrementing balances, verify each line's account is a leaf (no children). Reject with `Cannot post to a parent account; post to a leaf account instead.` when status is "posted".

### 4. API routes
- `src/app/api/accounting/accounts/route.ts` (GET): accept `?tree=true`; pass to `getAccounts`.
- `src/app/api/accounting/accounts/[id]/route.ts` (PATCH): pass `parentAccount` through to `updateAccount`; return 409 for cycle/parent-not-found errors.
- POST/PATCH/DELETE: surface validation errors with 400/409 statuses.
- Note: `src/app/app/dashboard/accounting/api/route.ts` is a parallel duplicate route; update for consistency or mark secondary/out of scope.

### 5. RTK Query — `src/store/slices/accountSlice/api.account.ts`
Add `tree?: boolean` to `AccountFilters` and forward as `?tree=true` in `getAccounts` query. Keep response shape `{ data, count }`.

### 6. UI
- `CreateAccountFormFields.tsx`: replace `parentAccount` text input with a `Select` of accounts (exclude self and all descendants to prevent cycles); show "None (top-level)" option.
- `AccountsList.tsx`: render rollup balance for parent rows (sum of descendant leaf balances) instead of hiding balance; keep existing indented tree + expand/collapse.
- `AccountDetailDialog.tsx`: show parent account name/link when `parentAccount` is set.

### 7. Seed data — `src/lib/accounting/seedAccounts.ts`
Add hierarchical examples (e.g., `1100 Cash` parent with `1101 Petty Cash` and `1102 Bank` children) so the tree is visible out of the box. Keep codes unique.

### 8. Validation
Run `npm run lint` and `npx tsc --noEmit`. Confirm no type errors across shared boundaries (model, service, API, RTK, UI).

## Key risks / caveats

- **Double-counting:** Reports/summaries that sum `account.balance` across all accounts will double-count parent + child balances. Sum only leaf accounts, or use rollup-aware totals. Audit `src/app/app/dashboard/accounting/page.tsx` summary and `FinancialReports`.
- **Two account API routes:** The top-level `/api/accounting/accounts` (used by RTK/page) and the dashboard `/app/dashboard/accounting/api` are duplicates. Keep both consistent if both remain in use.
- **Stored `balance` on parents:** With leaf-only posting, parent `balance` stays 0 from direct posts; rollup computed on-the-fly. Existing code that increments parent balance via `createTransaction` must be guarded by the leaf check (task 3).
- **Migration of existing data:** Existing accounts already have `parentAccount: null`; no data migration needed.

## Out of scope (for now)
- Materialized/cached parent balances (can add later if performance demands).
- Moving entire subtrees with drag-and-drop UI (programmatic reparenting via API is supported).
- Consolidated financial statements using rollups beyond the account list.

## Validation / acceptance
- Creating an account with itself as parent → 409 error.
- Creating A→B→A cycle → 409 error.
- Deleting an account that has children → 409 error.
- Posting a journal entry to a parent account → 400 error.
- `GET /api/accounting/accounts?tree=true` returns nested roots with `children`.
- `npm run lint` and `npx tsc --noEmit` pass.
