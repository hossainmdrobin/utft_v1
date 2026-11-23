# Installment Accounting Configuration (Settings + Installment Journal Posting)

## Existing architecture summary

### Settings UI + API
- **Settings page (App Router)**: `src/app/app/dashboard/settings/page.tsx`
  - Loads current settings via RTK Query: `useGetSettingsQuery()`.
  - Updates via RTK Query mutation: `useUpdateSettingsMutation()`.
  - Renders configuration cards under `src/app/app/dashboard/settings/components/*`.
- **Settings RTK slice**: `src/store/slices/settingSlice/api.setting.ts`
  - `GET /app/dashboard/settings/api` -> `getSettings`.
  - `PATCH /app/dashboard/settings/api` -> `updateSettings` (sends arbitrary patch object).
- **Settings API route**: `src/app/app/dashboard/settings/api/route.ts`
  - `GET` uses `getOrCreateSetting()` then returns `{ data: setting }`.
  - `PATCH` writes settings via `Setting.findByIdAndUpdate(setting._id, body, { new: true })`.
  - Writes an `AuditLog` entry.
  - **Currently no domain validation** for specific settings keys.
- **Settings Mongoose model/schema**: `src/integrations/mongodb/models/Setting.ts`
  - Flat scalar fields (currency, due day, etc.). No installment accounting config exists yet.

### Chart of Accounts
- **Account model**: `src/models/Account.ts`
  - Fields used for validation/UI: `type` (`asset|liability|equity|income|expense`), `isActive`, `code`, `name`.

### Installment journal posting (hardcoded accounts today)
- Installment payments ultimately call:
  - `src/app/app/dashboard/payments/api/post-payment/route.ts` (POST)
  - -> `src/lib/accounting/autoPost.ts` `postPayment()`
- **Hardcoded behavior in `autoPost.ts`**
  - For all non-overridden journal postings:
    - Debit account always uses `DEFAULT_CASH_CODE = "1211"` (Cash at Bank).
    - Credit account depends on `CREDIT_ACCOUNT_BY_SOURCE`, with `installment` crediting `"2101"`.
  - **Idempotency**:
    - `idempotencyKey = ${sourceType}:${sourceId}:${ref}:${dateStr}`
    - `JournalEntry.findOne({ reference: idempotencyKey, status: "posted" })`
  - Journal creation uses `createTransaction()` which enforces that **total debit equals total credit**.

## Goal
Extend the existing Settings module so admins can configure which Chart of Accounts entries are used for monthly installment journal transactions (debit + credit accounts). Then update installment journal posting to use the configured accounts instead of hardcoded IDs.

## Proposed changes

## 1) Database changes (extend existing Setting schema)

### Files
- `src/integrations/mongodb/models/Setting.ts`

### Steps
1. Add optional nested field:
   - `installmentAccounting?: {
       debitAccount: ObjectId; // ref: Account
       creditAccount: ObjectId; // ref: Account
     }`
2. Update the `ISetting` interface accordingly.
3. Keep all existing settings fields unchanged and optional to maintain backward compatibility.

## 2) Server validation + settings update

### Files
- `src/app/app/dashboard/settings/api/route.ts`
- `src/integrations/mongodb/models/Setting.ts` (schema ref support)

### Steps
1. In `PATCH(req)` after parsing `body`:
   - If `body.installmentAccounting` is present, validate it.
2. Validation rules (server is the source of truth):
   - Both ids must be present.
   - Both ids must be valid Mongo ObjectId strings.
   - Both accounts must exist.
   - Both must be active (`Account.isActive === true`).
   - Debit account type must be `"asset"`.
   - Credit account type must be `"liability"` or `"equity"`.
   - Debit and credit accounts must not be the same.
3. Reject invalid payloads with `400` and a clear error message.
4. Allow patching unrelated settings fields exactly as before.

### Notes
- Ensure validation happens before `findByIdAndUpdate`.
- Keep existing audit logging behavior.

## 3) Settings UI section

### Files
- `src/app/app/dashboard/settings/page.tsx`
- `src/app/app/dashboard/settings/components/InstallmentAccountingConfigurationSection.tsx` (new)

### UI requirements
- Add a new card section titled **Installment Accounting Configuration**.
- Add two **searchable dropdown** fields populated from existing Chart of Accounts:
  - Debit Account
    - Label: `Installment Debit Account`
    - Description: `Account debited when a member pays a monthly installment.`
    - Filter options: `isActive === true` and `type === "asset"`
    - Required
  - Credit Account
    - Label: `Installment Credit Account`
    - Description: `Account credited when a member pays a monthly installment.`
    - Filter options: `isActive === true` and `type IN ["liability","equity"]`
    - Required
- Dropdown option display:
  - `${account.code ?? "-"} - ${account.name}`
- Prevent selecting the same account on both sides.
- Disable **Save Changes** when:
  - not admin
  - loading settings/accounts
  - required selections missing
  - debit-credit are equal
  - selected ids are not valid for their allowed types (defensive client-side)
- Show loading/validation/success/error states:
  - Show disabled form while loading.
  - On submit: show loading state via the existing `isSaving` prop.
  - Use the existing toast mechanism (`sonner` / `useToast`) following patterns elsewhere in the codebase.

### Integration with current settings update flow
- The settings page currently passes `onUpdate={handleUpdate}` where `handleUpdate` calls `updateSettings(patch).unwrap()`.
- The new section component should call `onUpdate({ installmentAccounting: { debitAccount, creditAccount } })`.

## 4) Integrate with installment journal posting

### Files
- `src/lib/accounting/autoPost.ts`

### Steps
1. In `postPayment(input)` locate the non-override journal line building logic.
2. Add a dedicated branch for installment postings (`sourceType === "installment"`).
3. For installment postings:
   - Fetch the current settings (server-side) from Mongo `Setting`.
   - Validate that `installmentAccounting.debitAccount` and `installmentAccounting.creditAccount` exist.
   - Fetch both accounts and validate the same rules as the Settings API:
     - exist
     - active
     - debit is `asset`
     - credit is `liability` or `equity`
     - ids not equal
   - If configuration is missing/invalid: **throw** to reject posting.
4. Generate the journal entry lines using configured accounts:
   - Debit line:
     - `account: String(debitAccount._id)`
     - `debit: amount`, `credit: 0`
   - Credit line:
     - `account: String(creditAccount._id)`
     - `debit: 0`, `credit: amount`
   - Preserve the description format.
5. Override-lines requirement:
   - For `sourceType === "installment"`, ignore any `overrideLines` passed from the request.
   - For other `sourceType` values, keep existing `overrideLines` behavior unchanged.
6. Preserve existing idempotency logic:
   - Keep the `JournalEntryModel.findOne({ reference: idempotencyKey, status: "posted" })` check before line generation.
7. Preserve other workflows:
   - Only installment postings change; share/fine/donation/charge retain their existing mappings.

## 5) Backward compatibility + safety

### Settings document compatibility
- DB schema changes must be optional.
- The Settings page must handle missing `settings.installmentAccounting` without crashing.

### Historical entries
- Do not modify existing JournalEntry documents.
- Changing settings affects only future installment postings.

## 6) Testing & verification checklist (implementation agent)

### Settings
1. Existing settings load without errors.
2. Admin can select Debit and Credit accounts from correct filtered lists.
3. Selections persist after refresh.
4. Inactive accounts cannot be selected (UI filtering + server validation).
5. Same account cannot be selected on both sides.
6. Invalid account ids are rejected by the server.
7. PATCH updates only installmentAccounting without breaking other settings.

### Posting
1. With valid configuration, installment journal entries contain exactly 2 lines.
2. Debit and credit totals are balanced (createTransaction enforcement).
3. Idempotency still prevents duplicates.
4. Posting is rejected when configuration is missing/invalid.
5. Share/fine/donation/charge posting remains unchanged.

### Static checks
- Run `npm run lint`
- Run `npx tsc --noEmit`

## Files to modify/add (expected)
- Modify:
  - `src/integrations/mongodb/models/Setting.ts`
  - `src/app/app/dashboard/settings/api/route.ts`
  - `src/lib/accounting/autoPost.ts`
  - `src/app/app/dashboard/settings/page.tsx`
- Add:
  - `src/app/app/dashboard/settings/components/InstallmentAccountingConfigurationSection.tsx`

## Main risks to handle during implementation
- Settings API currently trusts patch payload; must add targeted validation for `installmentAccounting`.
- `autoPost.ts` must ignore installment overrideLines to avoid frontend-trusted account ids.
- UI must robustly handle missing/undefined settings fields on first load.
- Ensure TypeScript types for `SettingDoc` are updated to include the new optional nested field.
