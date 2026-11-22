import { z } from "zod";
import { tool } from "@langchain/core/tools";
import type { RunnableConfig } from "@langchain/core/runnables";
import { connectDB } from "@/integrations/mongodb/connection";
import { Account } from "@/models/Account";
import {
  extractAuthContext,
  isAuthorized,
  AUTHORIZED_ROLES,
  clampLimit,
  buildSort,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  type ToolAuthContext,
} from "./types";

const schema = z.object({
  code: z.string().optional().describe("Exact account code (e.g. 1211)."),
  name: z.string().optional().describe("Partial match on account name (case-insensitive)."),
  type: z
    .enum(["asset", "liability", "equity", "income", "expense"])
    .optional().describe("Account type."),
  category: z
    .enum(["asset", "liability", "equity", "income", "expense"])
    .optional().describe("Account category (maps to account type)."),
  isActive: z.boolean().optional().describe("Filter by active/inactive status."),
  parentAccount: z.string().optional().describe("Parent account MongoDB ObjectId (24 hex chars)."),
  limit: z.number().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT).describe("Maximum results. Default 10, max 50."),
  skip: z.number().min(0).default(0).describe("Number of results to skip for pagination."),
  sort_by: z.enum(["code", "name", "type", "createdAt", "updatedAt"]).optional().describe("Sort field."),
  sort_order: z.enum(["asc", "desc"]).optional().describe("Sort direction."),
});

export const searchAccountsTool = tool(
  async (input, config?: Partial<RunnableConfig>) => {
    const ctx: ToolAuthContext = extractAuthContext(config);
    if (!isAuthorized(ctx.role)) {
      return {
        error: "Access denied. Administrative privileges (admin, president, director, accountant, auditor) are required.",
      };
    }

    await connectDB();

    const limit = clampLimit(input.limit);
    const skip = input.skip ?? 0;
    const sort = buildSort(input.sort_by ?? "code", input.sort_order ?? "asc");

    const filter: Record<string, unknown> = {};
    if (input.code) filter.code = input.code.trim();
    if (input.name) {
      filter.name = new RegExp(input.name.trim(), "i");
    }
    if (input.type) filter.type = input.type;
    else if (input.category) filter.type = input.category;
    if (input.isActive !== undefined) filter.isActive = input.isActive;
    if (input.parentAccount) {
      if (/^[a-f\d]{24}$/i.test(input.parentAccount)) {
        filter.parentAccount = input.parentAccount;
      }
    }

    const query = Account.find(filter as any).lean();
    if (sort) query.sort(sort);
    const data = await query.skip(skip).limit(limit);
    const count = await Account.countDocuments(filter as any);

    return {
      data: data.map((acc) => ({
        id: String(acc._id),
        code: acc.code ?? null,
        name: acc.name,
        type: acc.type,
        category: acc.type,
        status: acc.isActive ? "active" : "inactive",
        isActive: acc.isActive,
        parentAccount: acc.parentAccount ? String(acc.parentAccount) : null,
        balance: Number(acc.balance ?? 0),
        description: acc.description ?? null,
      })),
      count,
      limit,
      skip,
      hasMore: skip + data.length < count,
    };
  },
  {
    name: "search_accounts",
    description: "Search the chart of accounts. Supports filtering by account code, name (partial), type/category (asset/liability/equity/income/expense), active status, and parent account. Returns paginated results with total count. Default limit 10, max 50. Read-only. Use to find accounts such as Cash at Bank (1211), all asset accounts, or all income accounts.",
    schema,
  },
);
