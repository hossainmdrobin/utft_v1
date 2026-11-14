import { connectDB } from "@/integrations/mongodb/connection";
import { Account } from "@/models/Account";
import { JournalEntry } from "@/models/JournalEntry";
import { AccountingPeriod } from "@/integrations/mongodb/models/AccountingPeriod";
import { getCurrentDhakaDate } from "@/lib/date/dhaka";
import { Types } from "mongoose";
import type { AccountingDateRange, AccountType } from "./types";

const AccountModel = Account as any;
const JournalEntryModel = JournalEntry as any;
const AccountingPeriodModel = AccountingPeriod as any;

export const DEBIT_NORMAL_TYPES = new Set<AccountType>(["asset", "expense"]);
export const POSTED_STATUS = "posted";
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 50;

export function isDebitNormal(accountType: string): boolean {
  return DEBIT_NORMAL_TYPES.has(accountType as AccountType);
}

export function balanceDelta(accountType: string, debit: number, credit: number): number {
  const d = Number(debit) || 0;
  const c = Number(credit) || 0;
  if (isDebitNormal(accountType)) {
    return d - c;
  }
  return c - d;
}

export function clampLimit(limit?: number): number {
  if (!limit || Number.isNaN(limit)) return DEFAULT_LIMIT;
  return Math.min(Math.max(1, Math.floor(limit)), MAX_LIMIT);
}

export function buildSort(sort_by?: string, sort_order?: "asc" | "desc"): Record<string, 1 | -1> | undefined {
  if (!sort_by) return undefined;
  return { [sort_by]: sort_order === "asc" ? 1 : -1 };
}

export function validateObjectId(id: string): boolean {
  return /^[a-f\d]{24}$/i.test(id);
}

function toObjectId(id: string | Types.ObjectId): Types.ObjectId {
  if (id instanceof Types.ObjectId) return id;
  return validateObjectId(String(id)) ? new Types.ObjectId(String(id)) : (new Types.ObjectId(id as any));
}

function dhakaParts(date: Date): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get("year"), m: get("month"), d: get("day") };
}

// 00:00:00.000 Asia/Dhaka on day D == 18:00:00.000 UTC on day D-1.
export function startOfDhakaDay(date: Date): Date {
  const { y, m, d } = dhakaParts(date);
  return new Date(Date.UTC(y, m - 1, d - 1, 18, 0, 0, 0));
}

// 23:59:59.999 Asia/Dhaka on day D == 17:59:59.999 UTC on day D. End is inclusive.
export function endOfDhakaDay(date: Date): Date {
  const { y, m, d } = dhakaParts(date);
  return new Date(Date.UTC(y, m - 1, d, 17, 59, 59, 999));
}

export function resolveDateRange(input: {
  period?: "today" | "this_month" | "last_month" | "this_year" | "last_year" | "custom";
  startDate?: string;
  endDate?: string;
  year?: number;
  month?: number;
}): AccountingDateRange {
  const now = new Date();
  const dhaka = getCurrentDhakaDate(now);
  let start: Date | undefined;
  let end: Date | undefined;
  let label = "all time";

  const { period, startDate, endDate, year, month } = input;

  if (period === "custom" || startDate || endDate) {
    if (startDate) start = new Date(startDate);
    if (endDate) end = new Date(endDate);
    label = "custom range";
  } else if (period === "today") {
    start = startOfDhakaDay(now);
    end = endOfDhakaDay(now);
    label = "today";
  } else if (period === "this_month") {
    const first = new Date(Date.UTC(dhaka.year, dhaka.month - 1, 1));
    start = startOfDhakaDay(first);
    const last = new Date(Date.UTC(dhaka.year, dhaka.month, 0));
    end = endOfDhakaDay(last);
    label = `${dhaka.year}-${String(dhaka.month).padStart(2, "0")}`;
  } else if (period === "last_month") {
    const last = new Date(Date.UTC(dhaka.year, dhaka.month - 1, 0));
    const lp = dhakaParts(last);
    start = startOfDhakaDay(new Date(Date.UTC(lp.y, lp.m - 1, 1)));
    end = endOfDhakaDay(last);
    label = `${lp.y}-${String(lp.m).padStart(2, "0")}`;
  } else if (period === "this_year") {
    start = startOfDhakaDay(new Date(Date.UTC(dhaka.year, 0, 1)));
    end = endOfDhakaDay(new Date(Date.UTC(dhaka.year, 11, 31)));
    label = `${dhaka.year}`;
  } else if (period === "last_year") {
    const ly = dhaka.year - 1;
    start = startOfDhakaDay(new Date(Date.UTC(ly, 0, 1)));
    end = endOfDhakaDay(new Date(Date.UTC(ly, 11, 31)));
    label = `${ly}`;
  } else if (year || month) {
    const y = year ?? dhaka.year;
    const m = month ?? dhaka.month;
    start = startOfDhakaDay(new Date(Date.UTC(y, m - 1, 1)));
    end = endOfDhakaDay(new Date(Date.UTC(y, m, 0)));
    label = `${y}-${String(m).padStart(2, "0")}`;
  }

  return {
    startDate: start,
    endDate: end,
    label,
    endInclusive: true,
    timezone: "Asia/Dhaka",
  };
}

function dateMatch(startDate?: Date, endDate?: Date): Record<string, unknown> {
  const match: Record<string, unknown> = {};
  if (startDate || endDate) {
    const dateFilter: Record<string, unknown> = {};
    if (startDate) dateFilter.$gte = startDate;
    if (endDate) dateFilter.$lte = endDate;
    match.date = dateFilter;
  }
  return match;
}

export interface AccountBalanceSums {
  totalDebit: number;
  totalCredit: number;
}

async function sumAccountLines(
  accountId: Types.ObjectId,
  extra: Record<string, unknown>,
): Promise<AccountBalanceSums> {
  const pipeline: any[] = [
    { $match: { status: POSTED_STATUS, "lines.account": accountId, ...extra } },
    { $unwind: "$lines" },
    { $match: { "lines.account": accountId } },
    {
      $group: {
        _id: null,
        d: { $sum: { $toDouble: "$lines.debit" } },
        c: { $sum: { $toDouble: "$lines.credit" } },
      },
    },
  ];
  const res = await JournalEntryModel.aggregate(pipeline);
  const row = res[0];
  return {
    totalDebit: Number(row?.d ?? 0),
    totalCredit: Number(row?.c ?? 0),
  };
}

export interface ComputedAccountBalance {
  account: {
    id: string;
    code?: string | null;
    name: string;
    type: AccountType;
    isActive: boolean;
    description?: string | null;
    parentAccount?: { id: string; code?: string | null; name: string; type: AccountType } | null;
  };
  storedBalance: number;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  calculatedBalance: number;
  balanceNature: "debit" | "credit";
  calculationPeriod: AccountingDateRange;
}

export async function computeAccountBalance(
  accountId: string,
  range: AccountingDateRange,
): Promise<ComputedAccountBalance> {
  await connectDB();
  const oid = toObjectId(accountId);
  const account = await AccountModel.findById(oid).lean();
  if (!account) {
    throw new Error(`Account not found: ${accountId}`);
  }
  const type = String(account.type);
  const { startDate, endDate } = range;

  const parent = account.parentAccount
    ? await AccountModel.findById(account.parentAccount).select("code name type").lean()
    : null;

  const rangeSum = await sumAccountLines(oid, dateMatch(startDate, endDate));

  let openingBalance = 0;
  if (startDate) {
    const openSum = await sumAccountLines(oid, {
      status: POSTED_STATUS,
      "lines.account": oid,
      date: { $lt: startDate },
    });
    openingBalance = balanceDelta(type, openSum.totalDebit, openSum.totalCredit);
  }

  const totalDebit = rangeSum.totalDebit;
  const totalCredit = rangeSum.totalCredit;
  const activity = balanceDelta(type, totalDebit, totalCredit);
  const calculatedBalance = openingBalance + activity;
  const normalSide: "debit" | "credit" = isDebitNormal(type) ? "debit" : "credit";
  const balanceNature: "debit" | "credit" =
    calculatedBalance >= 0 ? normalSide : normalSide === "debit" ? "credit" : "debit";

  const parentAccount =
    parent
      ? {
          id: String(parent._id),
          code: parent.code ?? null,
          name: parent.name,
          type: parent.type as AccountType,
        }
      : null;

  return {
    account: {
      id: String(account._id),
      code: account.code ?? null,
      name: account.name,
      type: type as AccountType,
      isActive: Boolean(account.isActive),
      description: account.description ?? null,
      parentAccount,
    },
    storedBalance: Number(account.balance ?? 0),
    openingBalance,
    totalDebit,
    totalCredit,
    calculatedBalance,
    balanceNature,
    calculationPeriod: {
      startDate: range.startDate,
      endDate: range.endDate,
      label: range.label,
      endInclusive: range.endInclusive,
      timezone: range.timezone,
    },
  };
}

export interface LedgerEntry {
  date: Date;
  reference?: string | null;
  journalEntryId: string;
  description?: string | null;
  lineDescription?: string | null;
  debit: number;
  credit: number;
  runningBalance: number;
  accountCode?: string | null;
  accountName?: string | null;
}

export interface GeneralLedgerResult {
  account: ComputedAccountBalance["account"];
  openingBalance: number;
  closingBalance: number;
  entries: LedgerEntry[];
  limit: number;
  skip: number;
  count: number;
  hasMore: boolean;
  calculationPeriod: AccountingDateRange;
}

export async function getGeneralLedger(
  accountId: string,
  range: { startDate?: Date; endDate?: Date; label: string },
  pagination: { limit: number; skip: number; sortOrder: "asc" | "desc" },
): Promise<GeneralLedgerResult> {
  await connectDB();
  const oid = toObjectId(accountId);
  const { startDate, endDate } = range;
  const { limit, skip, sortOrder } = pagination;

  const account = await AccountModel.findById(oid).lean();
  if (!account) {
    throw new Error(`Account not found: ${accountId}`);
  }
  const type = String(account.type);

  const baseMatch: Record<string, unknown> = {
    status: POSTED_STATUS,
    "lines.account": oid,
    ...dateMatch(startDate, endDate),
  };

  const entriesRaw = await JournalEntryModel.aggregate([
    { $match: baseMatch },
    { $unwind: "$lines" },
    { $match: { "lines.account": oid } },
    { $sort: { date: 1, createdAt: 1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $project: {
        date: 1,
        reference: 1,
        description: 1,
        createdAt: 1,
        debit: { $toDouble: "$lines.debit" },
        credit: { $toDouble: "$lines.credit" },
        lineDescription: "$lines.description",
      },
    },
  ]);

  const count = await JournalEntryModel.countDocuments(baseMatch);

  const openAsOf =
    entriesRaw.length > 0
      ? entriesRaw[0].date
      : startDate ?? endDate ?? new Date();

  const openSum = await sumAccountLines(oid, {
    status: POSTED_STATUS,
    "lines.account": oid,
    date: { $lt: openAsOf },
  });
  const openingBalance = balanceDelta(type, openSum.totalDebit, openSum.totalCredit);

  const entries: LedgerEntry[] = [];
  let running = openingBalance;
  for (const e of entriesRaw) {
    running = running + balanceDelta(type, e.debit, e.credit);
    entries.push({
      date: e.date,
      reference: e.reference ?? null,
      journalEntryId: String((e as any)._id ?? ""),
      description: e.description ?? null,
      lineDescription: e.lineDescription ?? null,
      debit: Number(e.debit) || 0,
      credit: Number(e.credit) || 0,
      runningBalance: running,
    });
  }

  const closingBalance = entries.length > 0 ? entries[entries.length - 1].runningBalance : openingBalance;

  return {
    account: {
      id: String(account._id),
      code: account.code ?? null,
      name: account.name,
      type: type as AccountType,
      isActive: Boolean(account.isActive),
      description: account.description ?? null,
      parentAccount: null,
    },
    openingBalance,
    closingBalance,
    entries,
    limit,
    skip,
    count,
    hasMore: skip + entries.length < count,
    calculationPeriod: {
      startDate,
      endDate,
      label: range.label,
      endInclusive: true,
      timezone: "Asia/Dhaka",
    },
  };
}

export interface TrialBalanceRow {
  id: string;
  code?: string | null;
  name: string;
  type: AccountType;
  totalDebit: number;
  totalCredit: number;
  balance: number;
  debitBalance: number;
  creditBalance: number;
}

export interface TrialBalanceResult {
  accounts: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
  difference: number;
  asOfDate?: Date;
  label: string;
  balanced: boolean;
}

export async function getTrialBalance(
  range: { endDate?: Date; label: string },
): Promise<TrialBalanceResult> {
  await connectDB();
  const { endDate } = range;
  const match: Record<string, unknown> = { status: POSTED_STATUS };
  if (endDate) match.date = { $lte: endDate };

  const sums = await JournalEntryModel.aggregate([
    { $match: match },
    { $unwind: "$lines" },
    {
      $group: {
        _id: "$lines.account",
        d: { $sum: { $toDouble: "$lines.debit" } },
        c: { $sum: { $toDouble: "$lines.credit" } },
      },
    },
  ]);
  const sumById = new Map<string, { d: number; c: number }>();
  for (const s of sums) {
    sumById.set(String(s._id), { d: Number(s.d ?? 0), c: Number(s.c ?? 0) });
  }

  const accounts = await AccountModel.find({}).lean();
  let totalDebit = 0;
  let totalCredit = 0;
  const rows: TrialBalanceRow[] = [];
  for (const acc of accounts) {
    const s = sumById.get(String(acc._id)) ?? { d: 0, c: 0 };
    const totalD = s.d;
    const totalC = s.c;
    const type = String(acc.type);
    const balance = balanceDelta(type, totalD, totalC);
    let debitBalance = 0;
    let creditBalance = 0;
    if (isDebitNormal(type)) {
      if (balance >= 0) debitBalance = balance;
      else creditBalance = -balance;
    } else {
      if (balance >= 0) creditBalance = balance;
      else debitBalance = -balance;
    }
    totalDebit += debitBalance;
    totalCredit += creditBalance;
    rows.push({
      id: String(acc._id),
      code: acc.code ?? null,
      name: acc.name,
      type: type as AccountType,
      totalDebit: totalD,
      totalCredit: totalC,
      balance,
      debitBalance,
      creditBalance,
    });
  }

  rows.sort((a, b) => (a.code ?? "").localeCompare(b.code ?? ""));
  const difference = totalDebit - totalCredit;
  return {
    accounts: rows,
    totalDebit,
    totalCredit,
    difference,
    asOfDate: endDate,
    label: range.label,
    balanced: Math.abs(difference) < 0.005,
  };
}

export interface FinancialPositionResult {
  asOfDate?: Date;
  label: string;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  equationDifference: number;
  equationHolds: boolean;
  byAccount: Array<{
    id: string;
    code?: string | null;
    name: string;
    type: AccountType;
    balance: number;
  }>;
}

export async function getFinancialPosition(
  range: { endDate?: Date; label: string },
): Promise<FinancialPositionResult> {
  const tb = await getTrialBalance(range);
  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquity = 0;
  const byAccount: FinancialPositionResult["byAccount"] = [];
  for (const row of tb.accounts) {
    byAccount.push({
      id: row.id,
      code: row.code,
      name: row.name,
      type: row.type,
      balance: row.balance,
    });
    if (row.type === "asset") totalAssets += row.balance;
    else if (row.type === "liability") totalLiabilities += row.balance;
    else if (row.type === "equity") totalEquity += row.balance;
  }
  const equationDifference = totalAssets - (totalLiabilities + totalEquity);
  return {
    asOfDate: tb.asOfDate,
    label: tb.label,
    totalAssets,
    totalLiabilities,
    totalEquity,
    equationDifference,
    equationHolds: Math.abs(equationDifference) < 0.005,
    byAccount,
  };
}

export interface IncomeExpenseRow {
  id: string;
  code?: string | null;
  name: string;
  type: AccountType;
  totalDebit: number;
  totalCredit: number;
  balance: number;
}

export interface IncomeExpenseResult {
  accounts: IncomeExpenseRow[];
  incomeByAccount: IncomeExpenseRow[];
  expenseByAccount: IncomeExpenseRow[];
  totalIncome: number;
  totalExpenses: number;
  net: number;
  label: string;
  calculationPeriod: AccountingDateRange;
}

export async function getIncomeExpenseSummary(
  range: { startDate?: Date; endDate?: Date; label: string },
): Promise<IncomeExpenseResult> {
  await connectDB();
  const { startDate, endDate } = range;
  const match: Record<string, unknown> = { status: POSTED_STATUS, ...dateMatch(startDate, endDate) };

  const sums = await JournalEntryModel.aggregate([
    { $match: match },
    { $unwind: "$lines" },
    {
      $group: {
        _id: "$lines.account",
        d: { $sum: { $toDouble: "$lines.debit" } },
        c: { $sum: { $toDouble: "$lines.credit" } },
      },
    },
  ]);
  const sumById = new Map<string, { d: number; c: number }>();
  for (const s of sums) {
    sumById.set(String(s._id), { d: Number(s.d ?? 0), c: Number(s.c ?? 0) });
  }

  const accounts = await AccountModel.find({ type: { $in: ["income", "expense"] } }).lean();
  let totalIncome = 0;
  let totalExpenses = 0;
  const accountsOut: IncomeExpenseRow[] = [];
  const incomeByAccount: IncomeExpenseRow[] = [];
  const expenseByAccount: IncomeExpenseRow[] = [];

  for (const acc of accounts) {
    const s = sumById.get(String(acc._id)) ?? { d: 0, c: 0 };
    const type = String(acc.type);
    const balance = balanceDelta(type, s.d, s.c);
    const row: IncomeExpenseRow = {
      id: String(acc._id),
      code: acc.code ?? null,
      name: acc.name,
      type: type as AccountType,
      totalDebit: s.d,
      totalCredit: s.c,
      balance,
    };
    accountsOut.push(row);
    if (type === "income") {
      totalIncome += balance;
      incomeByAccount.push(row);
    } else if (type === "expense") {
      totalExpenses += balance;
      expenseByAccount.push(row);
    }
  }

  accountsOut.sort((a, b) => (a.code ?? "").localeCompare(b.code ?? ""));
  incomeByAccount.sort((a, b) => (a.code ?? "").localeCompare(b.code ?? ""));
  expenseByAccount.sort((a, b) => (a.code ?? "").localeCompare(b.code ?? ""));

  return {
    accounts: accountsOut,
    incomeByAccount,
    expenseByAccount,
    totalIncome,
    totalExpenses,
    net: totalIncome - totalExpenses,
    label: range.label,
    calculationPeriod: {
      startDate,
      endDate,
      label: range.label,
      endInclusive: true,
      timezone: "Asia/Dhaka",
    },
  };
}

export async function listAccountingPeriods(filter: {
  year?: number;
  month?: number;
  is_locked?: boolean;
  limit: number;
  skip: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}): Promise<{
  data: Array<{
    id: string;
    year: number;
    month: number;
    status: string;
    is_locked: boolean;
    locked_at?: string | null;
    locked_by?: string | null;
    unlocked_at?: string | null;
    unlocked_by?: string | null;
    created_at?: Date;
    updated_at?: Date;
  }>;
  count: number;
  limit: number;
  skip: number;
  hasMore: boolean;
}> {
  await connectDB();
  const { year, month, is_locked, limit, skip, sort_by, sort_order } = filter;
  const match: Record<string, unknown> = {};
  if (year !== undefined) match.year = year;
  if (month !== undefined) match.month = month;
  if (is_locked !== undefined) match.is_locked = is_locked;

  const sort = buildSort(sort_by, sort_order) ?? { year: 1, month: 1 };
  const query = AccountingPeriodModel.find(match).lean();
  if (sort) query.sort(sort);
  const data = await query.skip(skip).limit(limit);
  const count = await AccountingPeriodModel.countDocuments(match);

  return {
    data: data.map((p) => ({
      id: String(p._id),
      year: p.year,
      month: p.month,
      status: p.is_locked ? "locked" : "open",
      is_locked: Boolean(p.is_locked),
      locked_at: p.locked_at ?? null,
      locked_by: p.locked_by ?? null,
      unlocked_at: p.unlocked_at ?? null,
      unlocked_by: p.unlocked_by ?? null,
      created_at: p.created_at,
      updated_at: p.updated_at,
    })),
    count,
    limit,
    skip,
    hasMore: skip + data.length < count,
  };
}
