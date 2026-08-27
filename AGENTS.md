# UTFT Agent Guide

## Project Shape

- This is a Next.js 14 App Router application. Route handlers and pages live under `src/app`; older page-oriented compositions are in `src/views`.
- Shared UI primitives are in `src/components/ui`; domain components are in `src/components` and feature route folders. Follow the existing shadcn/Radix and Tailwind patterns.
- Global providers are composed in `src/app/providers.tsx`. Redux Toolkit and RTK Query are configured in `src/store`; add feature endpoints through `injectEndpoint` and preserve tag invalidation.
- Server data is MongoDB/Mongoose-backed. Connection and auth helpers are under `src/integrations/mongodb`; models are under `src/models` and `src/integrations/mongodb/models`.
- `src/integrations/mongodb/client.ts` is intentionally a Supabase-shaped compatibility client that calls Next API routes backed by MongoDB. Do not replace it with direct Supabase SDK calls without tracing all consumers.

## Commands

Use npm, matching the checked-in `package-lock.json`:

```sh
npm install
npm run dev
npm run lint
npx tsc --noEmit
npm run build
npm run start
```

There is no test script or configured test runner. A Node test file exists under `src/app/app/dashboard/payments`, but it is TypeScript and is not directly runnable with plain Node; use the narrowest available lint/typecheck or add an appropriate runner only when the task requires it.

## Implementation Rules

- Use the `@/*` alias for imports from `src`.
- Add `"use client"` only to components that need browser APIs, hooks, or client-side state. Keep server route handlers and secrets server-side.
- For server authorization, use `getCurrentMember(req, roles)` from `src/lib/authenticaiton/verifications.ts` and verify the role list for every new or changed endpoint.
- Preserve existing API response shapes such as `{ data }`, `{ error }`, and optional `{ count }`.
- Authentication has two coordinated token paths: server checks the HTTP-only `token` cookie, while the compatibility client and RTK Query also use `localStorage.access_token`. Trace login, logout, and request behavior before changing either path.
- Preserve Dhaka timezone behavior in `src/lib/date/dhaka.ts` and the monthly installment logic.
- Check the owning route and model before adding APIs because the repository contains both generic `/api/db` access and domain-specific dashboard endpoints.
- Never expose or commit `.env` values. Payment and cron changes require careful handling of `MONGODB_URI`, `JWT_SECRET`, AamarPay variables, `NEXT_PUBLIC_APP_URL`, and `CRON_SECRET`.

## Operational Details

- The Vercel cron schedule in `vercel.json` is `18:00 UTC`, corresponding to midnight in Asia/Dhaka; the monthly installment endpoint requires `CRON_SECRET`.
- AamarPay callback URLs depend on `NEXT_PUBLIC_APP_URL`; verify deployed behavior when changing payment routes.
- `next.config.mjs` currently ignores ESLint failures during production builds, so run `npm run lint` separately and treat its failures as actionable.
- The root `README.md` contains stale Lovable/Vite boilerplate. Treat `package.json` and the Next.js source/configuration as authoritative.

## Change And Validation Workflow

- Start from the owning route, component, store slice, model, or helper and make the smallest compatible change.
- For API changes, verify authentication, authorization, validation, error responses, and cache invalidation together.
- After editing, run the narrowest relevant check first, then `npm run lint` and `npx tsc --noEmit` when the change crosses shared or typed boundaries. Do not commit changes unless explicitly requested.