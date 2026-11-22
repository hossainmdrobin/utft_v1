import { z } from "zod";
import { tool } from "@langchain/core/tools";
import type { RunnableConfig } from "@langchain/core/runnables";
import { connectDB } from "@/integrations/mongodb/connection";
import { getTrialBalance, resolveDateRange } from "./service";
import {
  extractAuthContext,
  isAuthorized,
  AUTHORIZED_ROLES,
  type ToolAuthContext,
} from "./types";

const schema = z.object({
  asOfDate: z.string().optional().describe("ISO date string. Report balances as of this date (Asia/Dhaka, inclusive)."),
  period: z
    .enum(["today", "this_month", "last_month", "this_year", "last_year", "custom"])
    .optional().describe("Predefined accounting period. Overrides asOfDate when set."),
  startDate: z.string().optional().describe("ISO date string (custom range start)."),
  endDate: z.string().optional().describe("ISO date string (custom range end)."),
});

export const getTrialBalanceTool = tool(
  async (input, config?: Partial<RunnableConfig>) => {
    const ctx: ToolAuthContext = extractAuthContext(config);
    if (!isAuthorized(ctx.role)) {
      return {
        error: "Access denied. Administrative privileges (admin, president, director, accountant, auditor) are required.",
      };
    }

    await connectDB();

    const { asOfDate, period, startDate, endDate } = input;
    const range = resolveDateRange({ period, startDate: asOfDate ?? startDate, endDate });
    const result = await getTrialBalance({ endDate: range.endDate, label: range.label });

    return {
      data: {
        accounts: result.accounts.map((a) => ({
          id: a.id,
          code: a.code,
          name: a.name,
          type: a.type,
          totalDebit: a.totalDebit,
          totalCredit: a.totalCredit,
          balance: a.balance,
          debitBalance: a.debitBalance,
          creditBalance: a.creditBalance,
        })),
        totalDebit: result.totalDebit,
        totalCredit: result.totalCredit,
        difference: result.difference,
        balanced: result.balanced,
        asOfDate: result.asOfDate,
        period: result.label,
        endInclusive: true,
        timezone: "Asia/Dhaka",
        note:
          "Balances are derived from posted journal entries only (draft/void excluded) as of the reporting date (inclusive). Zero-balance accounts are included. If totals differ, the actual difference is reported; no balancing is fabricated.",
      },
    };
  },
  {
    name: "get_trial_balance",
    description: "Generate a trial balance as of a specified date or accounting period. Returns every account with its code, name, type, debit/credit balance, and the total debit, total credit, and their difference. Never fabricates a balanced result; reports the actual difference. Read-only.",
    schema,
  },
);
