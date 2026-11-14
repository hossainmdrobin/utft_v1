import { z } from "zod";
import { tool } from "@langchain/core/tools";
import type { RunnableConfig } from "@langchain/core/runnables";
import { connectDB } from "@/integrations/mongodb/connection";
import { Account } from "@/models/Account";
import { computeAccountBalance, resolveDateRange } from "./service";
import {
  extractAuthContext,
  isAuthorized,
  AUTHORIZED_ROLES,
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
});

export const getAccountBalanceTool = tool(
  async (input, config?: Partial<RunnableConfig>) => {
    const ctx: ToolAuthContext = extractAuthContext(config);
    if (!isAuthorized(ctx.role)) {
      return {
        error: "Access denied. Administrative privileges (admin, president, director, accountant, auditor) are required.",
      };
    }

    await connectDB();

    const { account_id, code, startDate, endDate, period } = input;
    if (!account_id && !code) {
      return { error: "Provide account_id or code." };
    }

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
    const balance = await computeAccountBalance(String(account._id), range);

    return {
      data: {
        account: balance.account,
        storedBalance: balance.storedBalance,
        openingBalance: balance.openingBalance,
        totalDebit: balance.totalDebit,
        totalCredit: balance.totalCredit,
        calculatedBalance: balance.calculatedBalance,
        balanceNature: balance.balanceNature,
        calculationPeriod: balance.calculationPeriod,
        note:
          "Only posted journal entries are counted. Draft and void entries are excluded. Balance nature is relative to the account's normal balance side. End date is inclusive. Timezone: Asia/Dhaka.",
      },
    };
  },
  {
    name: "get_account_balance",
    description: "Calculate the actual balance of an account by ID or code over an optional date range or accounting period. Considers opening balance (posted entries before the range) and posted entries within the range. Excludes draft, void, and non-posted entries. Returns total debit, total credit, calculated balance, balance nature, and the calculation period. Read-only.",
    schema,
  },
);
