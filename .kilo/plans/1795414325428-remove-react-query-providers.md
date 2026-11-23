# Plan: Remove @tanstack/react-query from providers.tsx; keep auth page functional

## Goal
Edit `src/app/providers.tsx` to remove the `@tanstack/react-query` dependency (QueryClient/QueryClientProvider) and ensure the auth page (`src/app/auth/page.tsx` → `src/views/Auth.tsx`) remains functional.

## Key findings (context)
- `@tanstack/react-query` is NOT in `package.json` dependencies → not installed → importing it in `providers.tsx:4` is already broken.
- `supabase` is NOT present in `providers.tsx` → nothing to remove there. `supabase` is imported elsewhere (e.g. `UserManagement.tsx`, `ShareManagement.tsx`) from `@/integrations/mongodb/client`, but `src/integrations/mongodb/client.ts` does NOT exist (only `connection.ts` and `lib/auth.ts`). Those are pre-existing breakages outside the auth page and out of scope.
- Auth page data flow: `auth/page.tsx` → `Providers` → `views/Auth.tsx` → RTK Query hooks (`useVerifyCredentialsMutation`, `useLoginMutation`, `useUpdateAuthUserMutation`) → `store/baseApi` (`fetchBaseQuery`) → `/auth/api` Next route → MongoDB.
- RTK Query is powered by `react-redux` `<Provider>` (`components/providers/ReduxProvider.tsx`), NOT by `@tanstack/react-query` `QueryClientProvider`. Removing `QueryClientProvider` is safe for the auth page.
- Auth-path files (`auth/page.tsx`, `auth/SignupForm.tsx`, `auth/api/route.ts`) contain ZERO references to `QueryClient`, `useQuery`, `useMutation`, `useQueryClient`, or `supabase`.

## Decisions
1. Remove `QueryClient`/`QueryClientProvider` import and the `useState(() => new QueryClient())` hook from `providers.tsx`.
2. Remove the `<QueryClientProvider client={queryClient}>` wrapper; keep the nesting `ThemeProvider > TooltipProvider > Toaster/Sonner > ReduxProvider > children`.
3. Do NOT remove supabase from `providers.tsx` (not present). Do NOT edit unrelated view files that import react-query/supabase (out of scope; pre-existing breakage).
4. No env/secret changes needed (`MONGODB_URI`, `JWT_SECRET`, AamarPay, `NEXT_PUBLIC_APP_URL`, `CRON_SECRET` are untouched).

## Tasks
1. Edit `src/app/providers.tsx`:
   - Delete `import { QueryClient, QueryClientProvider } from "@tanstack/react-query";`
   - Delete `import { useState } from "react";` (no longer used) — keep only if another useState exists (it doesn't).
   - Delete `const [queryClient] = useState(() => new QueryClient());`
   - Remove `<QueryClientProvider client={queryClient}> ... </QueryClientProvider>` wrapper, promoting children one level.
2. Verify supabase is absent from `providers.tsx` (confirm no change needed).
3. Validate: run `npm run lint` and `npx tsc --noEmit`. Scope validation to `providers.tsx` and the auth page path. Expect tsc to report pre-existing errors in unrelated files importing `@tanstack/react-query` / missing `client.ts` — these are out of scope; confirm `providers.tsx`, `auth/page.tsx`, `views/Auth.tsx`, `auth/SignupForm.tsx`, `auth/api/route.ts`, and store files compile cleanly.

## Risks
- `npm run lint` / `tsc` run repo-wide and will surface unrelated pre-existing errors (react-query not installed; missing `client.ts` module). Do not treat those as caused by this change.
- Removing `QueryClientProvider` only affects code that consumes react-query context; the auth page consumes none.

## Open question (for user)
Should the broken `@tanstack/react-query` and `supabase` imports in unrelated view files (`UserManagement`, `ShareManagement`, `BulkSharePayment`, `PeriodLocking`, `CustomReportBuilder`, `AccountsList`, `OrganizationSettings`, etc.) also be cleaned up? Flagged as out of scope for this request.

## Validation
- `npm run lint` (repo-wide; note pre-existing unrelated failures).
- `npx tsc --noEmit` (note pre-existing unrelated errors; verify auth path + providers clean).
- Manual: auth page renders Sign In/Sign Up tabs; submit calls `verifyCredentials`/`login` via RTK Query; `loginData` redirects to `/app/dashboard`.
