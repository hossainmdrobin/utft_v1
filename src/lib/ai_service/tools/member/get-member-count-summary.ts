import { z } from "zod";
import { tool } from "@langchain/core/tools";
import type { RunnableConfig } from "@langchain/core/runnables";
import { connectDB } from "@/integrations/mongodb/connection";
import { Member } from "@/models/member";
import type { PipelineStage } from "mongoose";
import {
  extractAuthContext,
  isAuthorized,
  type ToolAuthContext,
} from "./types";

const schema = z.object({
  status: z.enum(["initiated", "pending", "approved", "rejected", "deceased", "inactive"]).optional().describe("Filter by membership stage."),
  registered_from: z.string().optional().describe("ISO date string. Include members registered on or after this date."),
  registered_to: z.string().optional().describe("ISO date string. Include members registered on or before this date."),
  year: z.number().min(2000).max(2100).optional().describe("Calendar year. Include members whose created_at year matches this value."),
  group_by: z.enum(["stage", "role", "member_type"]).optional().describe("Group counts by a field. When set, returns per-group breakdown instead of a single total."),
});

export const getMemberCountSummaryTool = tool(
  async (input, config?: Partial<RunnableConfig>) => {
    const ctx: ToolAuthContext = extractAuthContext(config);
    if (!isAuthorized(ctx.role)) {
      return { error: "Access denied. Administrative privileges (admin, president, director, accountant, auditor) are required." };
    }

    await connectDB();

    const filter: Record<string, unknown> = {};

    if (input.status) {
      filter.stage = input.status;
    }

    if (input.registered_from || input.registered_to || input.year) {
      const dateFilter: Record<string, unknown> = {};
      if (input.registered_from) {
        dateFilter.$gte = new Date(input.registered_from);
      }
      if (input.registered_to) {
        dateFilter.$lte = new Date(input.registered_to);
      }
      if (input.year) {
        const start = new Date(input.year, 0, 1);
        const end = new Date(input.year, 11, 31, 23, 59, 59, 999);
        dateFilter.$gte = start;
        dateFilter.$lte = end;
      }
      filter.created_at = dateFilter;
    }

    if (input.group_by) {
      const pipeline: PipelineStage[] = [
        { $match: filter },
        { $group: { _id: `$${input.group_by}`, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ];
      const groups = await Member.aggregate(pipeline);
      const byGroup: Record<string, number> = {};
      let total = 0;
      for (const g of groups) {
        const key = String(g._id ?? "unknown");
        byGroup[key] = g.count as number;
        total += g.count as number;
      }
      return {
        data: {
          group_by: input.group_by,
          total,
          by_group: byGroup,
          filter,
        },
      };
    }

    const total = await Member.countDocuments(filter);
    return {
      data: {
        total,
        filter,
      },
    };
  },
  {
    name: "get_member_count_summary",
    description: "Answer questions about member statistics. Supports status filtering (initiated/pending/approved/rejected/deceased/inactive), registration date range filtering, and calendar year filtering. Use MongoDB countDocuments for a single total, or aggregation with group_by (stage/role/member_type) for a per-group breakdown. Returns clearly labeled counts. Use when the user wants to know how many members exist, how many are active/pending/inactive, or how many joined in a given period.",
    schema,
  },
);
