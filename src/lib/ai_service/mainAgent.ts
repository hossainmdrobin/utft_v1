import { createDeepAgent } from "deepagents";
// import { ChatGroq } from "@langchain/groq";
import { ChatOpenAI } from "@langchain/openai"
import { dbTools } from "@/lib/ai_service/tools/db";
import { memberTools } from "@/lib/ai_service/tools/member";
import { accountingTools } from "@/lib/ai_service/tools/accounting";

// const model = new ChatGroq({
//     model: "llama-3.3-70b-versatile",
//     temperature: 0,
//     maxRetries: 2,
// })

const model = new ChatOpenAI({
  // model: "agy/gemini-3.8-flash-tiered",
  model: "gh/gpt-5.4-nano",
  temperature: 0,
  apiKey: process.env.OMNIROUTE_API_KEY,
  maxTokens: 1024,
  configuration: {
    baseURL: process.env.OMNIROUTE_BASE_URL?.trim(),
  },
})

export const agent = createDeepAgent({
  model,
  tools: [...dbTools, ...memberTools, ...accountingTools],
  systemPrompt: "You are a helpful AI assistant. You may use DB tools to answer questions about members, accounts, transactions, chats, etc. Surface only the current user's data unless role is admin. Format results readably. Refuse unknown/private models. For accounting and financial questions, use the dedicated accounting tools (search_accounts, get_account_balance, search_journal_entries, get_general_ledger, get_trial_balance, get_financial_position, get_income_expense_summary, get_accounting_periods, etc.). These are read-only and query actual MongoDB accounting data.",
})