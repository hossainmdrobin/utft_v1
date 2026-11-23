# Implementation Plan: Member Installment List on Profile Page

## Context
When an administrator (such as an Admin, President, or Director) navigates to a member's profile at `/app/dashboard/members/[id]`, they need full visibility into the member's monthly installments. Currently:
1. `NewInstallments.tsx` is placed awkwardly in the middle of the page (between `ProfilePage` and `FinancialSummaryCard`), displaying an advance payment creator along with raw, unstyled "Due Intallments" and "Recent Intallments" lists.
2. The installment lists lack clear grouping into "Due" and "Paid", and do not follow the polished table styling used by `FinancialHistoryTabs` (e.g., `DonationsTable`).
3. Administrative role checking in `page.tsx` relies only on `useAdmin()` (which checks Supabase `user_roles` for `role === "admin"`), overlooking executive roles such as `president` and `director` stored on the user record in Redux.

## Decisions Resolved
- **Target Location**: Bottom of the member profile page (`/app/dashboard/members/[id]`), below `FinancialHistoryTabs`.
- **Role Permissions**: Restricted to administrator roles: `admin`, `president`, and `director`. Non-administrative users cannot view this section.
- **Layout & Structure**: A dedicated `Card` with `Tabs`:
  - **Due Installments** (`Tab 1`): Table listing all unpaid/due installments with a "Mark as Paid" action.
  - **Paid Installments** (`Tab 2`): Table listing all completed/paid installments with payment date and method/transaction details.
  - **Record Advance** (`Tab 3`): Cleanly consolidated advance installment calculator and payment creator (previously standalone in `NewInstallments.tsx`).
- **Due Installment Action**: Admins can directly click "Mark as Paid" on any due installment, updating `status: "paid"`, `payment_status: "paid"`, and `paid_at: new Date().toISOString()`.

---

## Proposed Architecture & File Changes

### 1. `src/store/slices/installmentSlice/api.installment.ts`
- Enhance `actionOnInstallment` mutation to accept flexible update payloads (defaulting to or supporting `{ status: "paid", payment_status: "paid", paid_at: string }`), ensuring cache tags (`{ type: "INSTALLMENT", id: arg.id }`, `"INSTALLMENT"`) are invalidated on success.

### 2. `src/app/app/dashboard/members/[id]/MemberInstallmentsSection.tsx` (New or Refactored Component)
Create a new structured component `MemberInstallmentsSection`:
- **Data Fetching**:
  - Fetch member installments using `useGetInstallmentsByMemberIdQuery({ id: memberId })`.
  - Fetch system settings (`useGetSettingsQuery`) for currency symbol and default due day.
- **Classification Logic**:
  - `isPaid`: `item.payment_status === "paid" || String(item.status).toLowerCase() === "paid" || Boolean(item.transaction_id)`.
  - `dueInstallments`: Filter for `!isPaid`, sorted chronologically (oldest due first).
  - `paidInstallments`: Filter for `isPaid`, sorted reverse-chronologically (most recently paid first).
- **Tabs Structure**:
  1. **Due Installments Tab**:
     - Columns: `Period` (e.g., `October 2025`), `Amount` (e.g., `৳500.00`), `Due Date` (e.g., `10 Oct 2025`), `Status` (Badge: "Due" / "Overdue"), `Action` ("Mark as Paid" Button with loading state).
     - Empty state: Clean alert/message when no due installments exist.
  2. **Paid Installments Tab**:
     - Columns: `Period`, `Amount`, `Paid Date` (formatted `paid_at` or `updated_at`), `Method / Transaction` (e.g., `aamarpay`, `manual`, or transaction ID), `Status` (Badge: "Paid").
     - Empty state: Clean alert/message when no paid installments exist.
  3. **Record Advance Tab**:
     - Advance payment month selector (`-`, `+`, quick buttons `[2, 3, 6] months`).
     - Calculation of total based on member's `share_quantity * share_value`.
     - "Pay Advance Installments" trigger calling `createManualInstallment`.
- Clean up obsolete files (`SingleInstallmentCard.tsx` and raw `NewInstallments.tsx` replaced or superseded).

### 3. `src/app/app/dashboard/members/[id]/page.tsx`
- **Role Detection**:
  - Import `useGetCurrentUserQuery` from `@/store/slices/authSlice/api.auth`.
  - Compute administrator permission:
    ```typescript
    const { data: currentUserData } = useGetCurrentUserQuery();
    const userRole = currentUserData?.data?.role;
    const isAdministrator = isAdmin || ["admin", "president", "director"].includes(userRole || "");
    ```
- **Page Layout Order**:
  1. `<MemberHeader memberId={id} isAdmin={isAdministrator} ... />`
  2. `<ProfilePage memberProp={member} />`
  3. `<FinancialSummaryCard financialSummary={financialSummary} ... />`
  4. `<FinancialHistoryTabs ... />`
  5. `{isAdministrator && <MemberInstallmentsSection memberId={id} member={member} />}` (at the bottom of the page)
- Remove the old `<NewInstallments />` block located in the middle of the page.

---

## Failure Modes & Edge Cases
1. **Network or Authorization Failure**: If `/api/installments/[id]` fails (e.g., 403 or 500), display an inline error alert with a retry button instead of crashing the profile page.
2. **Missing Installment Fields**: Some legacy installment records may lack `payment_status` or `paid_at`; fall back gracefully to `status`, `updated_at`, or `date`.
3. **Empty Installments**: Members newly created who do not yet have generated installments will see clear empty states for both Due and Paid tabs.
4. **Immediate Invalidation**: Marking an installment as paid must immediately invalidate RTK Query tag `INSTALLMENT` so that the item shifts from "Due" to "Paid" without requiring a full page refresh.

---

## Verification Plan

### Automated Checks
- Run typecheck: `npx tsc --noEmit`
- Run linter: `npm run lint`

### Manual Verification Flow
1. **Admin / President / Director Access**:
   - Log in as an administrator (role: `admin`, `president`, or `director`).
   - Open `/app/dashboard/members/<member_id>`.
   - Verify the Installments card is rendered at the bottom of the page below Financial History.
   - Verify counts on the tabs: `Due Installments (X)`, `Paid Installments (Y)`, and `Record Advance`.
   - Verify that clicking "Mark as Paid" on a due installment updates it to Paid and moves it to the Paid tab.
2. **Non-Admin Access**:
   - Log in as a regular member or role without member administration permissions.
   - Verify the bottom Installments section is completely hidden.
