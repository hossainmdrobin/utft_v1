# Audit Log Persistence Plan

## Goal

Persist more audit logs across the application: cover all data-mutating API routes that currently lack audit entries, and add structured operational logging for auth events, cron executions, errors, and payment callbacks.

## Current State

**AuditLog model** (`src/integrations/mongodb/models/AuditLog.ts`): fields `table_name`, `record_id`, `action`, `action_type`, `description`, `old_data`, `new_data`, `changed_by`, `changed_at`, `deleted_by`, `deleted_at`, `is_deleted`. Collection `audit_logs`.

**Routes with audit logging (covered):**
- `src/app/app/dashboard/members/api/route.ts` — Member INSERT, UPDATE, DELETE
- `src/app/app/dashboard/members/api/change-password/route.ts` — Member UPDATE_PASSWORD
- `src/app/app/dashboard/accounting/api/route.ts` — Account INSERT, UPDATE, DELETE
- `src/app/app/dashboard/accounting/api/journalEntry/route.ts` — JournalEntry INSERT, UPDATE, DELETE
- `src/app/app/dashboard/accounting/api/journalEntry/[id]/route.ts` — JournalEntry UPDATE
- `src/app/api/accounting/transactions/route.ts` — JournalEntry INSERT
- `src/app/api/accounting/transactions/[id]/route.ts` — JournalEntry UPDATE, DELETE
- `src/app/app/dashboard/payments/api/post-payment/route.ts` — JournalEntry INSERT (payment posting)
- `src/app/api/aamarpay/callback/route.ts` — Installment UPDATE (installment_payment)
- `src/app/app/dashboard/activity-log/api/route.ts` — audit_logs DELETE (bulk soft-delete)

**Routes that mutate data but have NO audit logging (gaps):**
1. `src/app/app/dashboard/settings/api/route.ts` — PATCH (Setting changes)
2. `src/app/api/auth/[...path]/route.ts` — login/logout (auth events)
3. `src/app/api/aamarpay/route.ts` — POST (payment initiation)
4. `src/app/api/aamarpay/transactions/route.ts` — payment transactions
5. `src/app/api/installments/route.ts` — installment CRUD
6. `src/app/api/installments/manual/route.ts` — manual installments
7. `src/app/api/installments/manual/[id]/route.ts` — manual installment by ID
8. `src/app/api/upload/route.ts` — file uploads
9. `src/app/api/chat/route.ts` — chat operations
10. `src/app/api/chat/[chatId]/route.ts` — chat by ID
11. `src/app/api/chat/models/route.ts` — chat models
12. `src/app/api/db/[...path]/route.ts` — generic DB access
13. `src/app/api/cron/daily-email/route.ts` — cron job execution

**No operational logging infrastructure:** No logging library, all `console.log`/`console.error`. No auth event tracking (login success/failure), no cron execution logging, no structured error logging.

## Decisions

1. **Use existing AuditLog model** — do not create a new collection. Extend coverage to all data-mutating routes.
2. **Auth events** — log login success, login failure, logout, and password change to AuditLog with `table_name: "Auth"`, `action: "LOGIN"/"LOGOUT"/"LOGIN_FAILED"/"PASSWORD_CHANGE"`.
3. **Cron execution** — log monthly installment cron success/failure to AuditLog with `table_name: "System"`, `action: "CRON_EXECUTION"`.
4. **Operational errors** — keep `console.error` for unhandled errors but add structured context (route, user ID, timestamp) where feasible.
5. **No new dependencies** — do not add winston/pino; use existing Mongoose AuditLog model for persistence and `console.error` for operational errors.
6. **Auth event source** — login/logout happen in `src/app/api/auth/[...path]/route.ts`. Read that file to confirm the exact handler shape before implementing.

## Open Question (must resolve before implementation)

- The auth route file `src/app/api/auth/[...path]/route.ts` was not found at the expected path. Confirm the actual auth route file path(s) where login/logout occur so audit entries can be added there.

## Implementation Tasks (ordered)

### Phase 1: Audit log gaps on data-mutating routes

1. **Settings PATCH** — `src/app/app/dashboard/settings/api/route.ts`
   - Import `AuditLog`, `getCurrentMember`
   - On PATCH, capture old setting, create AuditLog entry: `table_name: "Setting"`, `action: "UPDATE"`, `old_data`, `new_data`, `changed_by`, `description`

2. **AamarPay payment initiation** — `src/app/api/aamarpay/route.ts`
   - On POST (payment created), create AuditLog: `table_name: "Payment"`, `action: "CREATE"`, record_id = transactionId, `new_data` = {amount, description, installments}, `changed_by` = user._id

3. **AamarPay transactions** — `src/app/api/aamarpay/transactions/route.ts`
   - Add AuditLog on transaction create/update as applicable

4. **Installment routes** — `src/app/api/installments/route.ts`, `manual/route.ts`, `manual/[id]/route.ts`
   - Add AuditLog on CREATE/UPDATE/DELETE: `table_name: "Installment"`

5. **File upload** — `src/app/api/upload/route.ts`
   - Add AuditLog: `table_name: "Media"`, `action: "INSERT"`, record_id = uploaded file ID

6. **Chat routes** — `src/app/api/chat/route.ts`, `chat/[chatId]/route.ts`, `chat/models/route.ts`
   - Add AuditLog on message send/update/delete: `table_name: "Message"` or `Chat`

7. **Generic DB route** — `src/app/api/db/[...path]/route.ts`
   - Add AuditLog on write operations (POST/PATCH/DELETE): capture table from path, action from method

### Phase 2: Auth event audit logging

8. **Auth routes** — confirm path, then add:
   - Login success: `table_name: "Auth"`, `action: "LOGIN"`, `changed_by` = user ID
   - Login failure: `table_name: "Auth"`, `action: "LOGIN_FAILED"`, `description` = reason
   - Logout: `table_name: "Auth"`, `action: "LOGOUT"`, `changed_by` = user ID

### Phase 3: System event logging

9. **Cron execution** — `src/app/api/cron/daily-email/route.ts` and `src/lib/cron/agenda.ts`
   - Log monthly installment run: `table_name: "System"`, `action: "CRON_EXECUTION"`, `description` = success/failure + installment count

10. **Payment callback failure** — `src/app/api/aamarpay/callback/route.ts`
    - Already logs installment payment on success. Add AuditLog on callback failure/error: `table_name: "Payment"`, `action: "CALLBACK_FAILED"`

## Validation

- Run `npm run lint` after changes
- Run `npx tsc --noEmit` to verify types
- Verify each new AuditLog entry is created by checking the activity-log API GET endpoint returns the new entries
- Verify no existing audit logging is broken (regression check on JournalEntry, Member, Account routes)

## Rollback

- All changes are additive (new AuditLog.create calls). No existing schema or data is modified.
- If a route's audit logging causes failures, wrap AuditLog.create in try/catch (non-blocking) matching the existing pattern in `post-payment/route.ts:41` and `aamarpay/callback/route.ts:131`.

## Out of Scope

- Adding a logging library (winston/pino) — deferred
- Log rotation / log shipping — deferred
- Frontend-side logging — out of scope
- Long-term log retention / archival policy — deferred