import { searchAccountsTool } from "./search-accounts";
import { getAccountDetailsTool } from "./get-account-details";
import { getAccountBalanceTool } from "./get-account-balance";
import { searchJournalEntriesTool } from "./search-journal-entries";
import { getJournalEntryDetailsTool } from "./get-journal-entry-details";
import { getGeneralLedgerTool } from "./get-general-ledger";
import { getTrialBalanceTool } from "./get-trial-balance";
import { getFinancialPositionTool } from "./get-financial-position";
import { getIncomeExpenseSummaryTool } from "./get-income-expense-summary";
import { getAccountingPeriodsTool } from "./get-accounting-periods";
import type { ToolAuthContext, ToolResult } from "./types";

export {
  searchAccountsTool,
  getAccountDetailsTool,
  getAccountBalanceTool,
  searchJournalEntriesTool,
  getJournalEntryDetailsTool,
  getGeneralLedgerTool,
  getTrialBalanceTool,
  getFinancialPositionTool,
  getIncomeExpenseSummaryTool,
  getAccountingPeriodsTool,
};

export type { ToolAuthContext, ToolResult };

export const accountingTools = [
  searchAccountsTool,
  getAccountDetailsTool,
  getAccountBalanceTool,
  searchJournalEntriesTool,
  getJournalEntryDetailsTool,
  getGeneralLedgerTool,
  getTrialBalanceTool,
  getFinancialPositionTool,
  getIncomeExpenseSummaryTool,
  getAccountingPeriodsTool,
];
