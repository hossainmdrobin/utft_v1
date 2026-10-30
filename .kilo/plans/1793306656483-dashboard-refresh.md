# Plan: Make dashboard functional — recent members (created/updated), recent installments, recent activities

**Goal:** Make `src/app/app/dashboard/Dashboard.tsx` fully functional: fix broken data fetches, show recent members ordered by create/update, add a Recent Installments card, and keep a Recent Activities card.

## Decisions (confirmed)

1. **Installments data source:** RTK Query `useGetInstallmentsQuery` → `/app/dashboard/payments/api` (existing route, matches payments-page pattern; no model registration needed). Client-side limit 5, ordered by `created_at` desc (server-side sort already applied).
2. **Recent Members:** single list of 5 members ordered by `updated_at` desc (captures both newly created and recently updated). Each row shows a "Joined" / "Updated" label based on whether `updated_at` differs from `created_at`.
3. **Recent Activities:** keep existing `audit_logs` query (model key `audit_logs` is registered; works today).

## Fixes required

- Dashboard stats/supabase queries use unregistered model keys (`members`, `share_transactions`, `trust_settings`) → 404 via `/api/db`. Registered keys are `Member`, `ShareTransaction`, `TrustStatement`... verified: `TrustSetting`, `ShareTransaction`, `Member`.
- `Installment` model exists at `src/models/Installment.ts` but is not used by the dashboard; using RTK endpoint avoids touching `models/index.ts`.

## Files affected

- `src/app/app/dashboard/Dashboard.tsx` — core changes (fix queries, reorder recent members, add installments card)
- Optionally `src/components/ui/card` if a reusable installment row variant is needed (prefer inline card content to keep change minimal)

## Task list

1. Update stats query in Dashboard.tsx: model keys `members`→`Member`, `share_transactions`→`ShareTransaction`, `trust_settings`→`TrustSetting`.
2. Update recent-members query: model `Member`, `.order("updated_at", { ascending: false })`, `.limit(5)`, select `id, full_name, member_type, status, created_at, updated_at`.
3. Add "Joined/Updated" label logic per member row (compare `created_at` vs `updated_at`).
4. Add Recent Installments card:
   - Call `useGetInstallmentsQuery()` (from `@/store/slices/paymentSlice/api.slice`).
   - Take first 5 of `data?.data`, map to rows: member name (`cus_name` fallback), amount, month/year, status, created_at/updated_at.
   - Loading/empty states matching existing cards.
5. Verify Recent Activity card uses `audit_logs` (registered alias) — no change needed; keep error/empty handling.
6. Run `npm run lint` and `npx tsc --noEmit`.

## Validation

- `npm run lint` — must pass (treated as actionable per AGENTS.md).
- `npx tsc --noEmit` — typecheck.
- No test runner configured; behavior verified via typecheck + existing payments API contract (`{ data, count }`).

## Boundaries / rollout

- No new API routes, no env changes, no auth changes. `/app/dashboard/payments/api` already serves installments without additional middleware beyond what exists.
- Do not commit unless explicitly requested.
