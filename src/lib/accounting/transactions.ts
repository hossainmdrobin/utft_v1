import { connectDB } from "@/integrations/mongodb/connection";
import { Account } from "@/models/Account";
import { JournalEntry } from "@/models/JournalEntry";
import { AuditLog } from "@/integrations/mongodb/models/AuditLog";
import { Types } from "mongoose";

const AccountModel = Account as any;
const JournalEntryModel = JournalEntry as any;

const DEBIT_NORMAL_TYPES = new Set(["asset", "expense"]);

function balanceDelta(accountType: string, debit: number, credit: number): number {
  const d = Number(debit) || 0;
  const c = Number(credit) || 0;
  if (DEBIT_NORMAL_TYPES.has(accountType)) {
    return d - c;
  }
  return c - d;
}

export interface TransactionFilters {
  dateFrom?: string;
  dateTo?: string;
  order?: "asc" | "desc";
  member?: string;
  status?: string;
  search?: string;
  account?: string;
  page?: number;
  limit?: number;
}

export async function getTransactions(filters: TransactionFilters = {}) {
  await connectDB();
  const { dateFrom, dateTo, order, member, status, search, account, page = 1, limit = 100 } = filters;
  const filter: Record<string, any> = {};
  if (dateFrom || dateTo) {
    filter.date = {};
    if (dateFrom) filter.date.$gte = new Date(dateFrom);
    if (dateTo) filter.date.$lte = new Date(dateTo);
  }
  if (member) filter.member = member;
  if (status) filter.status = status;
  if (search) {
    const regex = new RegExp(search, "i");
    filter.$or = [{ description: regex }, { reference: regex }];
  }
  if (account) {
    filter["lines.account"] = account;
  }
  const sortOrder = order === "asc" ? 1 : -1;
  const skip = (Number(page) - 1) * Number(limit);
  const [entries, count] = await Promise.all([
    JournalEntryModel.find(filter)
      .sort({ date: sortOrder, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    JournalEntryModel.countDocuments(filter),
  ]);
  return { data: entries, count };
}

export async function getTransactionById(id: string) {
  await connectDB();
  const entry = await JournalEntryModel.findById(id)
    .populate("member", "user_id full_name")
    .populate("created_by", "user_id full_name")
    .lean();
  if (!entry) {
    throw new Error("Journal entry not found");
  }
  return entry;
}

export async function createTransaction(data: any, user?: any) {
  await connectDB();
  const { date, reference, member, description, lines, status = "posted" } = data;
  if (!date) {
    throw new Error("Date is required");
  }
  if (!Array.isArray(lines) || lines.length < 2) {
    throw new Error("At least 2 lines are required");
  }
  for (const line of lines) {
    if (!line.account) {
      throw new Error("Account is required for every line");
    }
  }
  const totalDebit = lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.005) {
    throw new Error("Total debits must equal total credits");
  }

  const entry = await JournalEntryModel.create({
    date: new Date(date),
    reference: reference || undefined,
    member: member || null,
    description: description || "",
    lines,
    status,
    created_by: user?._id || user?.id || undefined,
  });

  if (status === "posted") {
    const lineAccountIds = [...new Set(lines.map((line) => String(line.account)))];
    const accounts = await AccountModel.find({
      _id: { $in: lineAccountIds.map((id) => new Types.ObjectId(id)) },
    }).lean();
    const accountById = new Map(accounts.map((acc) => [String(acc._id), acc]));
    const parentAccountIds = new Set(
      (await AccountModel.distinct("parentAccount", {
        parentAccount: { $in: lineAccountIds },
      })).map(String),
    );
    for (const line of lines) {
      const account = accountById.get(String(line.account)) as any;
      if (!account) {
        throw new Error(`Account not found: ${line.account}`);
      }
      if (parentAccountIds.has(String(line.account))) {
        throw new Error("Cannot post to a parent account; post to a leaf account instead.");
      }
      await AccountModel.findByIdAndUpdate(
        line.account,
        { $inc: { balance: balanceDelta(account.type, line.debit, line.credit) } },
      );
    }
  }

  try {
    await AuditLog.create({
      table_name: "JournalEntry",
      record_id: String((entry as any)._id),
      action: "INSERT",
      description: `Transaction/journal entry created: ${(entry as any).reference || (entry as any)._id} by ${user?.full_name || user?.user_id || user?.role || "system"}`,
      changed_by: user?._id ? String(user._id) : undefined,
      changed_at: new Date().toISOString(),
      new_data: entry,
    });
  } catch (e) {
    console.log("Audit log error:", e);
  }

  return entry;
}
