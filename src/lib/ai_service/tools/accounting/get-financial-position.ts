import { z } from "zod";
import { tool } from "@langchain/core/tools";
import type { RunnableConfig } from "@langchain/core/runnables";
import { connectDB } from "@/integrations/mongodb/connection";
import { getFinancialPosition, resolveDateRange } from "./service";
import {
  extractAuthContext,
  isAuthorized,
  AUTHORIZED_ROLES,
  type ToolAuthContext,
} from "./types";

const schema = z.object({
  asOfDate: z.string().optional().describe("ISO date string. Report financial position as of this date (Asia/Dhaka, inclusive)."),
  period: z
    .enum(["today", "this_month", "last_month", "this_year", "last_year", "custom"])
    .optional().describe("Predefined accounting period. Overrides asOfDate when set."),
  startDate: z.string().optional().describe("ISO date string (custom range start)."),
  endDate: z.string().optional().describe("ISO date string (custom range end)."),
});

export const getFinancialPositionTool = tool(
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
    const result = await getFinancialPosition({ endDate: range.endDate, label: range.label });

    return {
      data: {
        totalAssets: result.totalAssets,
        totalLiabilities: result.totalLiabilities,
        totalEquity: result.totalEquity,
        equationDifference: result.equationDifference,
        equationHolds: result.equationHolds,
        byAccount: result.byAccount.map((a) => ({
          id: a.id,
          code: a.code,
          name: a.name,
          type: a.type,
          balance: a.balance,
        })),
        asOfDate: result.asOfDate,
        period: result.label,
        endInclusive: true,
        timezone: "Asia/Dhaka",
        note:
          "Classification uses the account.type field (asset/liability/equity/income/expense), not account codes. Income and expense are not part of the balance sheet in v1's actual-payment approach, so Assets = Liabilities + Equity may not hold unless earnings are closed to equity. The actual difference is reported.",
      },
    };
  },
  {
    name: "get_financial_position",
    description: "Retrieve the organization's financial position as of a date or period: total assets, liabilities, equity, and account-level balances. Checks the accounting equation (Assets = Liabilities + Equity) and reports any discrepancy with an explanation. Read-only.",
    schema,
  },
);
