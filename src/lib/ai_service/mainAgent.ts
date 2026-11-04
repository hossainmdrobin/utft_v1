import { createDeepAgent } from "deepagents";
import { ChatGroq } from "@langchain/groq";
import { tool } from "@langchain/core/tools";
import { z } from "zod";


const model = new ChatGroq({
    model: "llama-3.3-70b-versatile",
    temperature: 0,
    maxRetries: 2,
})

const hello = tool(
  async ({}: {}) => {
    
    return {message:"hellow world"}
  },
  {
    name: "hello",
    description: "Print hello",
    schema: z.object({}),
  },
);

export const agent = createDeepAgent({
    model,
    tools:[hello],
    systemPrompt: "You are a helpful AI assistant.",
})