import { z } from "zod";
import { tool } from "@langchain/core/tools";
import type { RunnableConfig } from "@langchain/core/runnables";
import { connectDB } from "@/integrations/mongodb/connection";
import { Member } from "@/models/member";
import {
  extractAuthContext,
  isAuthorized,
  clampLimit,
  buildSort,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  SENSITIVE_MEMBER_FIELDS,
  type ToolAuthContext,
} from "./types";

const schema = z.object({
  status: z.enum(["initiated", "pending", "approved", "rejected", "deceased", "inactive"]).optional().describe("Filter by membership stage."),
  registered_from: z.string().optional().describe("ISO date string. Include members registered on or after this date."),
  registered_to: z.string().optional().describe("ISO date string. Include members registered on or before this date."),
  limit: z.number().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT).describe("Maximum number of results to return. Default 10, max 50."),
  skip: z.number().min(0).default(0).describe("Number of results to skip for pagination."),
  sort_by: z.enum(["created_at", "full_name", "serial", "stage"]).optional().describe("Field to sort results by. Defaults to created_at."),
  sort_order: z.enum(["asc", "desc"]).optional().describe("Sort direction. Defaults to desc."),
});

export const getMemberListTool = tool(
  async (input, config?: Partial<RunnableConfig>) => {
    const ctx: ToolAuthContext = extractAuthContext(config);
    if (!isAuthorized(ctx.role)) {
      return { error: "Access denied. Administrative privileges (admin, president, director, accountant, auditor) are required." };
    }

    await connectDB();

    const limit = clampLimit(input.limit);
    const skip = input.skip ?? 0;
    const sort = buildSort(input.sort_by ?? "created_at", input.sort_order ?? "desc");

    const filter: Record<string, unknown> = {};

    if (input.status) {
      filter.stage = input.status;
    }

    if (input.registered_from || input.registered_to) {
      const dateFilter: Record<string, unknown> = {};
      if (input.registered_from) {
        dateFilter.$gte = new Date(input.registered_from);
      }
      if (input.registered_to) {
        dateFilter.$lte = new Date(input.registered_to);
      }
      filter.created_at = dateFilter;
    }

    const query = Member.find(filter).lean().select(`-${SENSITIVE_MEMBER_FIELDS.join(" -")}`);
    if (sort) query.sort(sort);
    const data = await query.skip(skip).limit(limit);
    const count = await Member.countDocuments(filter);

    return {
      data,
      count,
      limit,
      skip,
      hasMore: skip + data.length < count,
    };
  },
  {
    name: "get_member_list",
    description: "List members filtered by membership stage and/or registration date range. Supports pagination, sorting, and total count. Default limit 10, max 50. Use when the user wants a list of members matching administrative criteria (e.g., all active members, pending approvals, members who joined in a date range).",
    schema,
  },
);
