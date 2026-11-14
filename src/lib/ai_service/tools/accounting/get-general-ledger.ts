import { z } from "zod";
import { tool } from "@langchain/core/tools";
import type { RunnableConfig } from "@langchain/core/runnables";
import { connectDB } from "@/integrations/mongodb/connection";
import { getGeneralLedger, resolveDateRange } from "./service";
import {
  extractAuthContext,
  isAuthorized,
  AUTHORIZED_ROLES,
  clampLimit,
  type ToolAuthContext,
} from "./types";

const schema = z.object({
  account_id: z.string().optional().describe("MongoDB ObjectId (24 hex chars) of the account."),
  code: z.string().optional().describe("Account code (e.g. 1211)."),
  startDate: z.string().optional().describe("ISO date string. Include entries on or after this date (Asia/Dhaka, inclusive)."),
  endDate: z.string().optional().describe("ISO date string. Include entries on or before this date (Asia/Dhaka, inclusive)."),
  period: z
    .enum(["today", "this_month", "last_month", "this_year", "last_year", "custom"])
    .optional().describe("Predefined accounting period. Overrides startDate/endDate when set."),
  limit: z.number().min(1).max(50).default(10).describe("Maximum results. Default 10, max 50."),
  skip: z.number().min(0).default(0).describe("Number of results to skip."),
});

export const getGeneralLedgerTool = tool(
  async (input, config?: Partial<RunnableConfig>) => {
    const ctx: ToolAuthContext = extractAuthContext(config);
    if (!isAuthorized(ctx.role)) {
      return {
        error: "Access denied. Administrative privileges (admin, president, director, accountant, auditor) are required.",
      };
    }

    await connectDB();

    const { account_id, code, startDate, endDate, period, limit, skip } = input;
    if (!account_id && !code) {
      return { error: "Provide account_id or code." };
    }

    const Account = (await import("@/models/Account")).Account;
    const filter: Record<string, unknown> = {};
    if (account_id) {
      if (!/^[a-f\d]{24}$/i.test(account_id)) {
        return { error: `Invalid account ID: ${account_id}` };
      }
      filter._id = account_id;
    } else {
      filter.code = code!.trim();
    }
    const account = await Account.findOne(filter as any).lean();
    if (!account) {
      return { error: `Account not found.` };
    }

    const range = resolveDateRange({ period, startDate, endDate });
    const result = await getGeneralLedger(String(account._id), range, {
      limit: clampLimit(limit),
      skip: skip ?? 0,
      sortOrder: "asc",
    });

    return {
      data: {
        account: result.account,
        openingBalance: result.openingBalance,
        closingBalance: result.closingBalance,
        entries: result.entries,
        limit: result.limit,
        skip: result.skip,
        count: result.count,
        hasMore: result.hasMore,
        calculationPeriod: result.calculationPeriod,
        note:
          "Running balances are calculated in chronological order from the opening balance before the first entry on the page. End date is inclusive. Timezone: Asia/Dhaka. Only posted entries are included.",
      },
    };
  },
  {
    name: "get_general_ledger",
    description: "Retrieve the general ledger for a specific account by ID or code over an optional date range or accounting period. Returns each transaction date, journal entry reference, description, debit, credit, and running balance, plus opening and closing balances. Pagination-safe: the opening balance is computed before the first entry on each page. Read-only.",
    schema,
  },
);
