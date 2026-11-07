import { createDeepAgent } from "deepagents";
import { ChatGroq } from "@langchain/groq";
import { ChatOpenAI } from "@langchain/openai"
import { tool } from "@langchain/core/tools";
import { z } from "zod";


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

const hello = tool(
  async ({ }: {}) => {

    return { message: "hellow world" }
  },
  {
    name: "hello",
    description: "Print hello",
    schema: z.object({}),
  },
);

export const agent = createDeepAgent({
  model,
  tools: [hello],
  systemPrompt: "You are a helpful AI assistant.",
})