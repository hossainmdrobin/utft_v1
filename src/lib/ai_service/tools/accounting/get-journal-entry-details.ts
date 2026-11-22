import { z } from "zod";
import { tool } from "@langchain/core/tools";
import type { RunnableConfig } from "@langchain/core/runnables";
import { connectDB } from "@/integrations/mongodb/connection";
import { JournalEntry } from "@/models/JournalEntry";
import {
  extractAuthContext,
  isAuthorized,
  AUTHORIZED_ROLES,
  type ToolAuthContext,
} from "./types";

const schema = z.object({
  id: z.string().describe("Journal entry MongoDB ObjectId (24 hex chars) or reference number."),
});

export const getJournalEntryDetailsTool = tool(
  async (input, config?: Partial<RunnableConfig>) => {
    const ctx: ToolAuthContext = extractAuthContext(config);
    if (!isAuthorized(ctx.role)) {
      return {
        error: "Access denied. Administrative privileges (admin, president, director, accountant, auditor) are required.",
      };
    }

    await connectDB();

    const { id } = input;
    const isObjectId = /^[a-f\d]{24}$/i.test(id);
    const query = JournalEntry.findOne(isObjectId ? { _id: id } : { reference: id } as any)
      .populate("lines.account", "code name type")
      .populate("member", "user_id full_name form_no serial")
      .populate("created_by", "user_id full_name")
      .populate("actioned_by", "user_id full_name")
      .lean();

    const entry = await query;
    if (!entry) {
      return { error: `Journal entry not found: ${id}` };
    }

    return {
      data: {
        id: String(entry._id),
        reference: entry.reference ?? null,
        date: entry.date,
        description: entry.description,
        status: entry.status,
        member: entry.member
          ? { id: String((entry.member as any)._id), user_id: (entry.member as any).user_id, name: (entry.member as any).full_name, form_no: (entry.member as any).form_no }
          : null,
        accountingPeriod: null,
        lines: (entry.lines ?? []).map((line: any) => ({
          account: line.account
            ? { id: String(line.account._id), code: line.account.code, name: line.account.name, type: line.account.type }
            : { id: String(line.account) },
          debit: Number(line.debit) || 0,
          credit: Number(line.credit) || 0,
          description: line.description ?? null,
        })),
        created_by: entry.created_by
          ? { id: String((entry.created_by as any)._id), user_id: (entry.created_by as any).user_id, name: (entry.created_by as any).full_name }
          : null,
        actioned_by: entry.actioned_by
          ? { id: String((entry.actioned_by as any)._id), user_id: (entry.actioned_by as any).user_id, name: (entry.actioned_by as any).full_name }
          : null,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      },
    };
  },
  {
    name: "get_journal_entry_details",
    description: "Retrieve complete details of one journal entry by ID or reference number. Returns transaction date, description, status, source (member), lines with account codes/names and amounts, and created/posted information. Read-only.",
    schema,
  },
);
