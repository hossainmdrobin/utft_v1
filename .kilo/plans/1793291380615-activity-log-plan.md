# Activity Log Feature Plan

## Goal

Expose the existing audit/activity trail as a working feature in the Next.js app router UI, backed by MongoDB, and make member mutations record consistent audit entries.

## Decisions

- Standardize on the existing `AuditLog` MongoDB model and the `audit_logs` table name used by `AuditLogs.tsx` and the dashboard.
- Keep scope to viewer + existing write sites (member create/update/delete). Do not add auto-capture to every mutation.
- Add a dedicated app-router page and sidebar entry rather than reusing the legacy `views/Settings.tsx` tab.
- Use `_id` as the document key in the UI (with string conversion) instead of the missing `id` field.

## Affected Files

- `src/integrations/mongodb/models/AuditLog.ts` — make `changed_at` optional with a default; keep schema compatible with viewer insert.
- `src/integrations/mongodb/models/index.ts` — register lowercase aliases `audit_logs` and `user_roles` so the compatibility client resolves models.
- `src/components/accounting/AuditLogs.tsx` — add `"use client"`; replace `log.id`/`activity.id` references with `String(log._id)`; update soft-delete to update each selected record; keep filters.
- `src/app/app/dashboard/Dashboard.tsx` — use `activity._id` for React keys.
- `src/app/app/dashboard/members/api/route.ts` — replace `Activity` writes with `AuditLog` writes (INSERT/UPDATE/DELETE) using correct fields and `changed_by` as string; remove `Activity` import.
- New `src/app/app/dashboard/activity-log/page.tsx` — render `<AuditLogs />`.
- `src/app/app/dashboard/Sidebar.tsx` — add "Activity Log" nav item (admin/president/director/accountant/auditor).

## Implementation Steps

1. Update `AuditLog` schema: `changed_at` default `() => new Date().toISOString()`, not required.
2. Add model aliases in `models/index.ts`:
   - `audit_logs: AuditLog`
   - `user_roles: UserRole`
3. Update `AuditLogs.tsx`:
   - Add `"use client"` directive.
   - Use `String(log._id)` for selection keys and delete targets.
   - Change `deleteLogs` to iterate selected ids and PATCH each via `supabase.from("audit_logs").update({...}).eq("_id", id)`.
   - Keep existing filters and view dialog.
4. Update `Dashboard.tsx` recent activity key to `String(activity._id)`.
5. Update members API to import `AuditLog` and write entries:
   - POST create: INSERT with description, `changed_by: String(member._id)`, `changed_at`.
   - PATCH update: fetch old member, UPDATE with `old_data`/`new_data`, `changed_by: String(user._id)`.
   - DELETE: fetch before delete, DELETE entry with `old_data`.
6. Add activity-log page and sidebar entry.

## Risks

- Generic client `.id` vs `_id` mismatch is systemic; this plan only fixes activity-log surfaces. Other features may still rely on `id` and remain broken.
- `useAdmin` depends on `user_roles` alias and `user.id`; if auth session lacks role, delete button hidden but viewer still works.
- Soft-delete loop issues multiple requests; acceptable for admin-only action.

## Validation

- `npm run lint`
- `npx tsc --noEmit`
- Manual: create/update/delete a member, then open Activity Log page and confirm entries appear; verify date/table/action filters and view details; verify soft delete as admin.
