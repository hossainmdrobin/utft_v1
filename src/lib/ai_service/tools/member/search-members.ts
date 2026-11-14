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
  name: z.string().optional().describe("Partial match on full name, father name, or mother name (case-insensitive)."),
  member_id: z.string().optional().describe("Exact identifier match. Accepts MongoDB ObjectId, user_id, form_no, serial number, or unique_code."),
  phone: z.string().optional().describe("Partial match on mobile phone number."),
  email: z.string().optional().describe("Exact or partial match on email address (case-insensitive)."),
  status: z.enum(["initiated", "pending", "approved", "rejected", "deceased", "inactive"]).optional().describe("Exact membership stage filter."),
  limit: z.number().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT).describe("Maximum number of results to return. Default 10, max 50."),
  skip: z.number().min(0).default(0).describe("Number of results to skip for pagination."),
  sort_by: z.enum(["created_at", "full_name", "serial", "form_no", "stage"]).optional().describe("Field to sort results by. Defaults to created_at."),
  sort_order: z.enum(["asc", "desc"]).optional().describe("Sort direction. Defaults to desc."),
});

export const searchMembersTool = tool(
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

    if (input.name) {
      const regex = new RegExp(input.name.trim(), "i");
      filter.$or = [
        { full_name: regex },
        { father_name: regex },
        { mother_name: regex },
      ];
    }

    if (input.email) {
      filter.email = new RegExp(input.email.trim(), "i");
    }

    if (input.phone) {
      filter.mobile = new RegExp(input.phone.trim(), "i");
    }

    if (input.status) {
      filter.stage = input.status;
    }

    if (input.member_id) {
      const id = input.member_id.trim();
      const orClauses: Record<string, unknown>[] = [];

      if (/^[a-f\d]{24}$/i.test(id)) {
        orClauses.push({ _id: id });
      }

      orClauses.push({ user_id: id }, { form_no: id });
      const serialNum = Number(id);
      if (!Number.isNaN(serialNum)) {
        orClauses.push({ serial: serialNum });
      }

      if (orClauses.length > 0) {
        if (filter.$or) {
          filter.$and = [{ $or: filter.$or }, { $or: orClauses }];
          delete filter.$or;
        } else {
          filter.$or = orClauses;
        }
      }
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
    name: "search_members",
    description: "Search members using flexible filters. Supports partial text matching on name, phone, email, and exact matching on member ID (ObjectId, user_id, form_no, serial number). Filter by membership stage (initiated/pending/approved/rejected/deceased/inactive). Returns paginated results with total count. Default limit 10, max 50. Use when the user wants to find one or more members without knowing the exact ID.",
    schema,
  },
);
