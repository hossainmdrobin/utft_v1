# Personalized DB-Driven Chatbot Plan

## Goal
Transform `src/app/app/chat/ChatWindow.tsx` from a dummy-data-driven UI into a personalized chatbot that persists conversations and streams database-backed AI responses.

## Context
- `ChatWindow.tsx` currently loads `initialMessages` from `dummyData.ts` and only appends locally via `handleSend`.
- `MessageInput.tsx` already calls `useCreateConversationMutation` and `useAgentStream`, but the two send paths (`handleSend` vs `callAgent`) are inconsistent and the stream endpoint is wrong (`/api/${chatId}` instead of `/api/chat/${chatId}`).
- Backend route `src/app/api/chat/[chatId]/route.ts` already authenticates via `getCurrentMember`, loads message history from MongoDB, streams an agent response, and persists the assistant message.
- Agent in `src/lib/ai_service/mainAgent.ts` only exposes a `hello` tool; needs DB query tools.

## Proposed Changes
1. **State management (ChatWindow)**
   - Remove `initialMessages`/dummy data usage; initialize `messages` from fetched conversation history.
   - Add loading/error state for history fetch.
   - Subscribe to agent stream events to append user message immediately and assistant message on completion.
   - Derive `chatId` from params; when absent, render `StartChat` and create conversation on first send.

2. **API integration**
   - Fix `useAgentStream` fetch URL to `/api/chat/${chatId}`.
   - Align `MessageInput` send path: single `handleSend` that either creates a conversation (no chatId) or streams via agent (chatId present); remove duplicate `callAgent`.
   - Pass `onSend` callback that appends optimistic user message and triggers stream.

3. **Backend communication**
   - Ensure POST body includes `{ prompt }` (route expects `prompt`, not `message`).
   - Persist user message before streaming (currently only assistant persisted); add `MessageModel.create` for user turn.
   - Return/emit `done` event already implemented; client should append final assistant text.

4. **Personalization & DB querying**
   - Add auth context to agent: pass user id/role into agent configurable; restrict queries by `getCurrentMember`.
   - Add LangChain tools in `mainAgent.ts` for DB reads (e.g., members, payments, chats) using Mongoose models with user-scoped filters.
   - System prompt should describe available data and privacy constraints.

5. **Data flow**
   - Client: send prompt -> API loads history -> agent runs with DB tools -> streams events -> persists assistant -> client appends.

## Files to Touch
- `src/app/app/chat/ChatWindow.tsx`
- `src/app/app/chat/MessageInput.tsx`
- `src/lib/ai_service/use-agent-stream.ts`
- `src/app/api/chat/[chatId]/route.ts`
- `src/lib/ai_service/mainAgent.ts`

## Risks
- Auth roles currently limited to admin/president/director; broaden if chatbot is for all members.
- Streaming persistence partial failure could duplicate messages; use idempotent message ids.
- Agent tool calls may expose unauthorized data; enforce server-side filters.

## Validation
- `npm run lint` and `npx tsc --noEmit`.
- Manual: create chat, send prompt, verify streamed response and DB persistence.