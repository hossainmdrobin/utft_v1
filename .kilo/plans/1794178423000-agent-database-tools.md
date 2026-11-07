# Plan: Give the agent read-only database tools

**Goal:** Enable the chat agent (`src/lib/ai_service/mainAgent.ts`) to present database information on user prompt, via LangChain/deepagents tools backed by MongoDB/Mongoose.

## Context

- Agent entry: `src/lib/ai_service/mainAgent.ts:37` — `createDeepAgent({ model, tools: [hello], systemPrompt })`. Model is ChatOpenAI via OmniRoute (`OMNIROUTE_API_KEY` / `OMNIROUTE_BASE_URL`).
- Chat route: `src/app/api/chat/[chatId]/route.ts:92` — authenticates with `getCurrentMember(request)` (HTTP-only `token` cookie), then calls `agent.stream(..., { configurable: { thread_id, userId, role } })`. `tool_call` / `tool_result` `AgentEvent`s are already encoded and streamed to the frontend (`src/lib/ai_service/events.ts`, `src/lib/ai_service/use-agent-stream.ts`). No route changes needed for tool events to reach the UI.
- DB: `src/integrations/mongodb/connection.ts` — cached `connectDB()`. Models registered in `src/integrations/mongodb/models/index.ts` (Member, Account, JournalEntry, MonthlyDonation, MemberCharge, FineRule, FineTransaction, ShareReceivable, ShareTransaction, AuditLog, ContributionSetting, OrganizationSetting, TrustSetting, ReportTemplate, UserRole, AccountingPeriod, Setting) plus `src/models` (Chat, Message, etc.).
- Auth boundary: route authenticates before the agent runs; `userId` and `role` are available in agent `configurable`.
- AGENTS.md rules: `@/*` imports, `"use client"` only where needed, `getCurrentMember` for server auth, preserve `{ data }` / `{ error }` response shapes, never commit `.env`.

## Decisions (confirmed with user)

1. **Read-only tools in v1** — no create/update/delete.
2. **Whitelisted models only** — not every registered model.
3. **No automatic row-level scoping inside tools** — route authenticates; `userId`/`role` flow through `configurable`; system prompt instructs the agent to surface only the current user's data (admins excepted).

## Tools to add (`src/lib/ai_service/tools/db.ts`, new file)

- `db_list_models()` — returns whitelisted model names (+ optional field hints) so the agent knows what it can query.
- `db_query({ model, filter?, limit?, sort?, fields? })` — `Model.find(filter).sort().limit().lean()`; returns `{ data, count }`.
- `db_find_one({ model, filter })` — `Model.findOne(filter).lean()`; returns `{ data }`.
- `db_count({ model, filter })` — `Model.countDocuments(filter)`; returns `{ count }`.

All tools call `connectDB()` themselves (idempotent cache) so they work regardless of whether the route already connected. Tool errors return `{ error }` shapes, never raw stack traces. `limit` capped (e.g., 100). `model` validated against the whitelist; unknown model → `{ error }`.

## mainAgent.ts changes

- Import `dbTools` from `@/lib/ai_service/tools/db` and append to `tools`.
- Extend `systemPrompt`: agent may use DB tools to answer questions about members, accounts, transactions, chats, etc.; surface current user's data unless role is admin; format results readably; refuse unknown/private models.

## Tool context (verification item)

Tools need `userId`/`role` for user-scoped reads. deepagents/LangChain tools receive `RunnableConfig` as the second handler argument, where `configurable.userId` / `configurable.role` should be present from `agent.stream`. Verify at implementation; fallback: set a request-scoped context in the route before `agent.stream` and read it in tools.

## Ordered tasks

1. Create `src/lib/ai_service/tools/db.ts` with `db_list_models`, `db_query`, `db_find_one`, `db_count` (read-only, whitelisted models, `connectDB()`, `{ data }`/`{ error }` shapes).
2. Update `src/lib/ai_service/mainAgent.ts` — import `dbTools`, add to `tools`, extend system prompt.
3. Confirm `tool_call`/`tool_result` events still stream in `src/app/api/chat/[chatId]/route.ts` (no change expected).
4. Run `npm install` (node_modules appears absent), then `npm run lint` and `npx tsc --noEmit` to validate.

## Risks / open questions

- deepagents may not forward `configurable` to tool handlers — verify `_call(input, config)` signature at implementation; have fallback ready.
- Tool outputs can be large (many docs) — `limit` cap and `fields` projection mitigate; agent must summarize rather than dump raw data.
- Sensitive fields (passwords, tokens) — exclude via `fields`/select defaults; e.g. Member excludes `password`.
- No test runner configured — validate via lint + tsc only.
