import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { connectDB } from "@/integrations/mongodb/connection";
import { models } from "@/integrations/mongodb/models";
import { ChatModel } from "@/models/Chat";
import { MessageModel } from "@/models/Message";

const Chat = ChatModel;
const Message = MessageModel;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const WHITELIST: Record<string, any> = {
  ...models,
  Chat,
  Message,
};

const SENSITIVE: Record<string, string[]> = {
  Member: ["password"],
};

const LIMIT_CAP = 100;

function getModel(name: string) {
  const m = WHITELIST[name];
  if (!m) return null;
  return m;
}

const listModelsTool = tool(
  async () => {
    await connectDB();
    return { data: Object.keys(WHITELIST) };
  },
  {
    name: "db_list_models",
    description: "List whitelisted database models available for querying.",
    schema: z.object({}),
  }
);

const queryTool = tool(
  async ({ model, filter, limit, sort, fields }) => {
    await connectDB();
    const M = getModel(model);
    if (!M) return { error: `Unknown model: ${model}` };
    const lim = Math.min(limit ?? 20, LIMIT_CAP);
    let q = M.find(filter ?? {}).lean();
    if (sort) q = q.sort(sort);
    if (fields) q = q.select(fields);
    const defaultExcl = SENSITIVE[model];
    if (defaultExcl && !fields) q = q.select(defaultExcl.map((f) => `-${f}`).join(" "));
    const data = await q.limit(lim);
    const count = await M.countDocuments(filter ?? {});
    return { data, count };
  },
  {
    name: "db_query",
    description: "Query documents from a whitelisted model.",
    schema: z.object({
      model: z.string(),
      filter: z.record(z.any()).optional(),
      limit: z.number().optional(),
      sort: z.record(z.number()).optional(),
      fields: z.string().optional(),
    }),
  }
);

const findOneTool = tool(
  async ({ model, filter }) => {
    await connectDB();
    const M = getModel(model);
    if (!M) return { error: `Unknown model: ${model}` };
    const defaultExcl = SENSITIVE[model];
    let q = M.findOne(filter ?? {}).lean();
    if (defaultExcl) q = q.select(defaultExcl.map((f) => `-${f}`).join(" "));
    const data = await q;
    return { data };
  },
  {
    name: "db_find_one",
    description: "Find a single document from a whitelisted model.",
    schema: z.object({
      model: z.string(),
      filter: z.record(z.any()).optional(),
    }),
  }
);

const countTool = tool(
  async ({ model, filter }) => {
    await connectDB();
    const M = getModel(model);
    if (!M) return { error: `Unknown model: ${model}` };
    const count = await M.countDocuments(filter ?? {});
    return { count };
  },
  {
    name: "db_count",
    description: "Count documents in a whitelisted model.",
    schema: z.object({
      model: z.string(),
      filter: z.record(z.any()).optional(),
    }),
  }
);

export const dbTools = [listModelsTool, queryTool, findOneTool, countTool];
