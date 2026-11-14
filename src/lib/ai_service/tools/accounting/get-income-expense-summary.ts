import { z } from "zod";
import { tool } from "@langchain/core/tools";
import type { RunnableConfig } from "@langchain/core/runnables";
import { connectDB } from "@/integrations/mongodb/connection";
import { getIncomeExpenseSummary, resolveDateRange } from "./service";
import {
  extractAuthContext,
  isAuthorized,
  AUTHORIZED_ROLES,
  type ToolAuthContext,
} from "./types";

const schema = z.object({
  period: z
    .enum(["this_month", "last_month", "this_year", "last_year", "custom"])
    .optional().describe("Predefined accounting period."),
  startDate: z.string().optional().describe("ISO date string (custom range start, Asia/Dhaka, inclusive)."),
  endDate: z.string().optional().describe("ISO date string (custom range end, Asia/Dhaka, inclusive)."),
  year: z.number().min(2000).max(2100).optional().describe("Calendar year (used with month)."),
  month: z.number().min(1).max(12).optional().describe("Calendar month (used with year)."),
});

export const getIncomeExpenseSummaryTool = tool(
  async (input, config?: Partial<RunnableConfig>) => {
    const ctx: ToolAuthContext = extractAuthContext(config);
    if (!isAuthorized(ctx.role)) {
      return {
        error: "Access denied. Administrative privileges (admin, president, director, accountant, auditor) are required.",
      };
    }

    await connectDB();

    const { period, startDate, endDate, year, month } = input;
    const range = resolveDateRange({ period, startDate, endDate, year, month });
    const result = await getIncomeExpenseSummary(range);

    return {
      data: {
        incomeByAccount: result.incomeByAccount.map((a) => ({
          id: a.id,
          code: a.code,
          name: a.name,
          type: a.type,
          totalDebit: a.totalDebit,
          totalCredit: a.totalCredit,
          balance: a.balance,
        })),
        expenseByAccount: result.expenseByAccount.map((a) => ({
          id: a.id,
          code: a.code,
          name: a.name,
          type: a.type,
          totalDebit: a.totalDebit,
          totalCredit: a.totalCredit,
          balance: a.balance,
        })),
        totalIncome: result.totalIncome,
        totalExpenses: result.totalExpenses,
        net: result.net,
        label: result.label,
        calculationPeriod: result.calculationPeriod,
        note:
          "Derived from posted journal entries only, using account.type (income/expense). Does not treat collected donations or payments as income unless posted to an income account. End date is inclusive. Timezone: Asia/Dhaka.",
      },
    };
  },
  {
    name: "get_income_expense_summary",
    description: "Retrieve income and expense information for a monthly, yearly, or custom date range. Returns income by account, expense by account, total income, total expenses, and net surplus/deficit. Based on posted journal entries and account classifications. Read-only.",
    schema,
  },
);
