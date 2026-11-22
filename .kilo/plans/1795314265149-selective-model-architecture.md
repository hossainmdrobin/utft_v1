# Implementation Plan: Selective Model Architecture for AI Chatbot

## Overview
Implement a selective model architecture enabling users to fetch available LLM models from the configured provider (OmniRoute) and dynamically select their preferred model for chat interactions.

## Background & Architecture
- **Current State:** `src/lib/ai_service/mainAgent.ts` exports a static singleton `agent` hardcoded to model `gh/gpt-5.4-nano` via `ChatOpenAI` pointing to `OMNIROUTE_BASE_URL` with `OMNIROUTE_API_KEY`.
- **Target State:**
  1. A backend endpoint (`GET /api/chat/models`) queries the provider's `/models` endpoint, returning available model IDs with a resilient fallback.
  2. `mainAgent.ts` exports a dynamic `getAgent(modelName?: string)` factory that caches compiled agent instances per model in memory.
  3. `POST /api/chat/[chatId]` accepts `model` in the request body and routes requests through `getAgent(model)`.
  4. The `Chat` model schema in MongoDB persists the chosen model per conversation.
  5. The frontend displays a model selector in `ChatHeader.tsx` powered by RTK Query (`chatApi.useGetAvailableModelsQuery`), and propagates the choice via `useAgentStream`.

---

## Detailed Task Breakdown

### 1. Provider Model Discovery Endpoint
- **File:** `src/app/api/chat/models/route.ts` (new)
- **Functionality:**
  - Authenticate the request via `getCurrentMember(request)`. Return 401 if unauthorized.
  - Read `OMNIROUTE_BASE_URL` and `OMNIROUTE_API_KEY` from `process.env`.
  - Format the provider URL (ensuring `${baseURL}/models` endpoint resolution).
  - Perform `fetch` with `Authorization: Bearer ${apiKey}` and `next: { revalidate: 300 }` (cache for 5 minutes).
  - Parse OpenAI-standard `{ data: Array<{ id: string }> }` structure and extract model IDs.
  - Provide a fallback list (e.g. `['gh/gpt-5.4-nano', 'agy/gemini-3.8-flash-tiered']`) if the provider request fails or environment variables are missing.
  - Return standard `{ data: string[] }` format per project conventions.

### 2. Dynamic Agent Factory & In-Memory Cache
- **File:** `src/lib/ai_service/mainAgent.ts`
- **Changes:**
  - Create an in-memory cache: `const agentCache = new Map<string, ReturnType<typeof createDeepAgent>>()`.
  - Export `getAgent(modelName?: string)`:
    - Default to `modelName || process.env.DEFAULT_AI_MODEL || "gh/gpt-5.4-nano"`.
    - Check `agentCache`. If cached, return the compiled agent.
    - If not cached, instantiate `new ChatOpenAI({ model: selectedModel, temperature: 0, apiKey: process.env.OMNIROUTE_API_KEY, maxTokens: 1024, configuration: { baseURL: process.env.OMNIROUTE_BASE_URL?.trim() } })`.
    - Create agent via `createDeepAgent({ model, tools: [...dbTools, ...memberTools, ...accountingTools], systemPrompt })`.
    - Cache and return the agent.
  - Keep `export const agent = getAgent()` for backwards compatibility.

### 3. Chat Schema & Conversation Endpoints
- **Files:**
  - `src/models/Chat.ts`:
    - Add `model: { type: String, default: "gh/gpt-5.4-nano" }` to `chatSchema`.
  - `src/app/api/chat/route.ts`:
    - In `POST`, accept `body.model` and include it when creating `ChatModel.create({ user, title, model: body.model || "gh/gpt-5.4-nano" })`.
  - `src/app/api/chat/[chatId]/route.ts`:
    - Update `BodyType` to `{ prompt: string; conversationId?: string; model?: string }`.
    - Find the chat record: if `body.model` is provided, use it; otherwise fall back to `chat.model` or the default.
    - If `body.model` differs from `chat.model`, update `ChatModel.findByIdAndUpdate(chatId, { model: body.model })`.
    - Retrieve agent via `const selectedAgent = getAgent(activeModel)`.
    - Run stream with `selectedAgent.stream(...)`.

### 4. Client State & Stream Hook
- **Files:**
  - `src/lib/ai_service/use-agent-stream.ts`:
    - Update signature: `runAgentStream: (chatId: string, prompt: string, model?: string) => Promise<boolean>`.
    - Include `model` in the JSON request body sent to `/api/chat/${chatId}`.
  - `src/store/slices/chatSlice/api.chat.ts`:
    - Add endpoint `getAvailableModels: builder.query<{ data: string[] }, void>` pointing to `/api/chat/models`.
    - Export `useGetAvailableModelsQuery`.

### 5. Chat UI Integration
- **Files:**
  - `src/app/app/chat/ChatHeader.tsx`:
    - Accept props: `selectedModel: string`, `onSelectModel: (model: string) => void`, and `availableModels: string[]`.
    - Render a sleek model selector dropdown using `@/components/ui/select` (`Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`).
    - Include model icon / badge and friendly display label.
  - `src/app/app/chat/ChatWindow.tsx`:
    - Fetch models with `useGetAvailableModelsQuery()`.
    - Manage `selectedModel` state (defaulting to conversation's stored model or first available model).
    - Sync `selectedModel` when conversation data is fetched.
    - Pass `selectedModel` and setter to `ChatHeader`.
    - Pass `selectedModel` into `runAgentStream(chatId, prompt, selectedModel)`.

---

## Edge Cases & Failure Modes
1. **Provider Unavailable / Bad API Key:** The backend `/api/chat/models` catches network/auth errors and returns default fallback models so the UI never breaks.
2. **Invalid Model Selected:** If a user supplies an unsupported model ID, the agent stream catches the provider error and emits an `AgentEvent` of `{ type: "error", message: "..." }` handled by `useAgentStream`.
3. **Cold Start & Agent Cache:** Compiling `deepagents` graphs on every request introduces latency; caching agents by `modelName` eliminates repetitive initialization overhead while isolating model instances.

---

## Validation & Verification Plan
1. **Lint & Types:**
   - Run `npm run lint` and `npx tsc --noEmit` to ensure type safety across all updated signatures (`useAgentStream`, `ChatModel`, `getAgent`).
2. **Endpoint Verification:**
   - Test `GET /api/chat/models` to confirm it returns `{ data: [...] }`.
3. **Execution & Selection Verification:**
   - Switch models in the `ChatHeader` dropdown.
   - Send prompts with each selected model and verify via network inspect / server logs that the requested model is instantiated and streams responses properly.
