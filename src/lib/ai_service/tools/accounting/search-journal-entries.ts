import { z } from "zod";
import { tool } from "@langchain/core/tools";
import type { RunnableConfig } from "@langchain/core/runnables";
import { connectDB } from "@/integrations/mongodb/connection";
import { JournalEntry } from "@/models/JournalEntry";
import { resolveDateRange, clampLimit, buildSort } from "./service";
import {
  extractAuthContext,
  isAuthorized,
  AUTHORIZED_ROLES,
  type ToolAuthContext,
} from "./types";

const schema = z.object({
  id: z.string().optional().describe("Journal entry MongoDB ObjectId (24 hex chars)."),
  reference: z.string().optional().describe("Exact or partial match on reference number (case-insensitive)."),
  description: z.string().optional().describe("Partial match on description (case-insensitive)."),
  member: z.string().optional().describe("Member MongoDB ObjectId linked to the entry."),
  status: z.enum(["draft", "posted", "void"]).optional().describe("Entry status."),
  startDate: z.string().optional().describe("ISO date string. Include entries on or after this date (Asia/Dhaka, inclusive)."),
  endDate: z.string().optional().describe("ISO date string. Include entries on or before this date (Asia/Dhaka, inclusive)."),
  period: z
    .enum(["today", "this_month", "last_month", "this_year", "last_year", "custom"])
    .optional().describe("Predefined accounting period. Overrides startDate/endDate when set."),
  debitAccount: z.string().optional().describe("Account MongoDB ObjectId or code appearing as a debit line."),
  creditAccount: z.string().optional().describe("Account MongoDB ObjectId or code appearing as a credit line."),
  minAmount: z.number().optional().describe("Minimum amount filter on any debit or credit line."),
  maxAmount: z.number().optional().describe("Maximum amount filter on any debit or credit line."),
  limit: z.number().min(1).max(50).default(10).describe("Maximum results. Default 10, max 50."),
  skip: z.number().min(0).default(0).describe("Number of results to skip."),
  sort_by: z.enum(["date", "reference", "createdAt", "status"]).optional().describe("Sort field."),
  sort_order: z.enum(["asc", "desc"]).optional().describe("Sort direction."),
});

export const searchJournalEntriesTool = tool(
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
    const sort = buildSort(input.sort_by ?? "date", input.sort_order ?? "desc");
    const range = resolveDateRange({ period: input.period, startDate: input.startDate, endDate: input.endDate });

    const filter: Record<string, unknown> = {};
    if (input.id) {
      if (!/^[a-f\d]{24}$/i.test(input.id)) {
        return { error: `Invalid journal entry ID: ${input.id}` };
      }
      filter._id = input.id;
    }
    if (input.reference) filter.reference = new RegExp(input.reference.trim(), "i");
    if (input.description) filter.description = new RegExp(input.description.trim(), "i");
    if (input.member) {
      if (/^[a-f\d]{24}$/i.test(input.member)) filter.member = input.member;
    }
    if (input.status) filter.status = input.status;
    if (range.startDate || range.endDate) {
      const dateFilter: Record<string, unknown> = {};
      if (range.startDate) dateFilter.$gte = range.startDate;
      if (range.endDate) dateFilter.$lte = range.endDate;
      filter.date = dateFilter;
    }
    if (input.debitAccount || input.creditAccount) {
      const or: Record<string, unknown>[] = [];
      if (input.debitAccount) {
        or.push({ "lines.account": input.debitAccount, "lines.debit": { $gt: 0 } });
      }
      if (input.creditAccount) {
        or.push({ "lines.account": input.creditAccount, "lines.credit": { $gt: 0 } });
      }
      filter.$or = or;
    }
    if (input.minAmount !== undefined || input.maxAmount !== undefined) {
      const amountFilter: Record<string, unknown> = {};
      if (input.minAmount !== undefined) amountFilter.$gte = input.minAmount;
      if (input.maxAmount !== undefined) amountFilter.$lte = input.maxAmount;
      filter.$or = [...(filter.$or ? [filter.$or] : []), { "lines.debit": amountFilter }, { "lines.credit": amountFilter }];
    }

    const query = JournalEntry.find(filter as any)
      .populate("lines.account", "code name type")
      .populate("member", "user_id full_name form_no")
      .lean();
    if (sort) query.sort(sort);
    const data = await query.skip(skip).limit(limit);
    const count = await JournalEntry.countDocuments(filter as any);

    return {
      data: data.map((entry) => ({
        id: String(entry._id),
        reference: entry.reference ?? null,
        date: entry.date,
        description: entry.description,
        status: entry.status,
        member: entry.member
          ? { id: String((entry.member as any)._id), user_id: (entry.member as any).user_id, name: (entry.member as any).full_name }
          : null,
        lines: (entry.lines ?? []).map((line: any) => ({
          account: line.account
            ? { id: String(line.account._id), code: line.account.code, name: line.account.name, type: line.account.type }
            : { id: String(line.account) },
          debit: Number(line.debit) || 0,
          credit: Number(line.credit) || 0,
          description: line.description ?? null,
        })),
        createdAt: entry.createdAt,
      })),
      count,
      limit,
      skip,
      hasMore: skip + data.length < count,
      period: range.label,
      endInclusive: range.endInclusive,
      timezone: range.timezone,
    };
  },
  {
    name: "search_journal_entries",
    description: "Search journal entries with flexible filters: ID, reference, description, member, status, date range/accounting period, debit or credit account, and amount range. Source information is carried by the member and reference fields. Supports pagination, sorting, total count, default limit 10, max 50. Only posted/draft/void statuses are respected. Read-only.",
    schema,
  },
);
