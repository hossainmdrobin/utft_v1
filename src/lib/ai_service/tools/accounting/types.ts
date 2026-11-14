import {
  extractAuthContext,
  isAuthorized,
  AUTHORIZED_ROLES,
  type ToolAuthContext,
  type ToolResult,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  clampLimit,
  buildSort,
  validateObjectId,
} from "../member/types";

export {
  extractAuthContext,
  isAuthorized,
  AUTHORIZED_ROLES,
  type ToolAuthContext,
  type ToolResult,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  clampLimit,
  buildSort,
  validateObjectId,
};

export type AccountType = "asset" | "liability" | "equity" | "income" | "expense";

export interface AccountingDateRange {
  startDate?: Date;
  endDate?: Date;
  label: string;
  endInclusive: boolean;
  timezone: string;
}

export interface AccountBalanceResult {
  account: {
    id: string;
    code?: string;
    name: string;
    type: AccountType;
    isActive: boolean;
    description?: string;
    parentAccount?: { id: string; code?: string; name: string; type: AccountType } | null;
  };
  storedBalance: number;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  calculatedBalance: number;
  balanceNature: "debit" | "credit";
  calculationPeriod: AccountingDateRange;
}
