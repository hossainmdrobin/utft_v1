import { Account } from "@/models/Account";
import { JournalEntry } from "@/models/JournalEntry";
import { connectDB } from "@/integrations/mongodb/connection";
import { Types } from "mongoose";
import { AuditLog } from "@/integrations/mongodb/models/AuditLog";

const AccountModel = Account as any;
const JournalEntryModel = JournalEntry as any;

export interface AccountFilters {
  type?: string;
  isActive?: boolean;
  search?: string;
  tree?: boolean;
}

export async function getAccounts(filters: AccountFilters = {}) {
  await connectDB();
  const { type, isActive, search, tree } = filters;
  const filter: Record<string, any> = {};
  if (type) filter.type = type;
  if (isActive !== undefined) filter.isActive = isActive;
  if (search) {
    const regex = new RegExp(search, "i");
    filter.$or = [{ name: regex }, { code: regex }];
  }
  const accounts = await AccountModel.find(filter).sort({ code: 1, name: 1 }).lean();
  if (!tree) {
    return { data: accounts, count: accounts.length };
  }
  const map = new Map<string, any>();
  const roots: any[] = [];
  accounts.forEach((acc) => {
    map.set(String(acc._id), { ...acc, children: [] });
  });
  accounts.forEach((acc) => {
    const node = map.get(String(acc._id))!;
    if (acc.parentAccount && map.has(String(acc.parentAccount))) {
      map.get(String(acc.parentAccount))!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  const sortChildren = (nodes: any[]) => {
    nodes.sort((a, b) => (a.code || "").localeCompare(b.code || ""));
    nodes.forEach((node) => sortChildren(node.children));
  };
  sortChildren(roots);
  return { data: roots, count: accounts.length };
}

export async function getRollupBalance(accountId: string): Promise<number> {
  await connectDB();
  const descendantIds = await getLeafDescendantIds(accountId);
  if (descendantIds.length === 0) return 0;
  const accounts = await AccountModel.find({
    _id: { $in: descendantIds },
  }).lean();
  return accounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0);
}

async function getLeafDescendantIds(accountId: string): Promise<string[]> {
  await connectDB();
  const leaves: string[] = [];
  const queue: string[] = [accountId];
  while (queue.length) {
    const current = queue.shift()!;
    const children = await AccountModel.find({ parentAccount: current }).lean();
    if (children.length === 0) {
      leaves.push(current);
    } else {
      children.forEach((child) => queue.push(String(child._id)));
    }
  }
  return leaves;
}

export async function createAccount(data: any, user?: any) {
  await connectDB();
  const { code, name, type, parentAccount, description } = data;
  if (!name || !type) {
    throw new Error("Account name and type are required");
  }
  if (parentAccount) {
    await AccountModel.validateParent(new Types.ObjectId(), parentAccount);
  }
  if (code) {
    const existing = await AccountModel.findOne({ code });
    if (existing) {
      throw new Error("Account code already exists");
    }
  }
  const account = await AccountModel.create({
    code: code || undefined,
    name,
    type,
    parentAccount: parentAccount || null,
    description: description || "",
    balance: 0,
    isActive: true,
  });

  try {
    await AuditLog.create({
      table_name: "Account",
      record_id: String((account as any)._id),
      action: "INSERT",
      description: `Account created: ${(account as any).name} (${(account as any).code || "no code"}) by ${user?.full_name || user?.user_id || user?.role || "system"}`,
      changed_by: user?._id ? String(user._id) : undefined,
      changed_at: new Date().toISOString(),
      new_data: account,
    });
  } catch (e) {
    console.log("Audit log error:", e);
  }

  return account;
}

export async function updateAccount(id: string, data: any, user?: any) {
  await connectDB();
  const oldAccount = await AccountModel.findById(id).lean();
  if (!oldAccount) {
    throw new Error("Account not found");
  }

  if (data.code !== undefined || data.type !== undefined) {
    const hasPostedEntries = await JournalEntryModel.exists({ "lines.account": id, status: "posted" });
    if (hasPostedEntries) {
      throw new Error("Cannot change account code or type when posted journal entries exist");
    }
  }

  if (data.parentAccount !== undefined) {
    await AccountModel.validateParent(id, data.parentAccount);
  }

  const account = await AccountModel.findByIdAndUpdate(id, data, { new: true }).lean();
  if (!account) {
    throw new Error("Account not found");
  }

  try {
    await AuditLog.create({
      table_name: "Account",
      record_id: String(id),
      action: "UPDATE",
      description: `Account updated by ${user?.full_name || user?.user_id || user?.role || "system"}`,
      old_data: oldAccount,
      new_data: account,
      changed_by: user?._id ? String(user._id) : undefined,
      changed_at: new Date().toISOString(),
    });
  } catch (e) {
    console.log("Audit log error:", e);
  }

  return account;
}

export async function deleteAccount(id: string, user?: any) {
  await connectDB();
  const hasTransactions = await JournalEntryModel.exists({ "lines.account": id });
  if (hasTransactions) {
    throw new Error("Cannot delete an account that has attached transactions");
  }
  const hasChildren = await AccountModel.exists({ parentAccount: id });
  if (hasChildren) {
    throw new Error("Cannot delete an account that has child accounts");
  }
  const oldAccount = await AccountModel.findById(id).lean();
  const account = await AccountModel.findByIdAndDelete(id);
  if (!account) {
    throw new Error("Account not found");
  }

  try {
    await AuditLog.create({
      table_name: "Account",
      record_id: String(id),
      action: "DELETE",
      description: `Account deleted: ${oldAccount?.name || id} by ${user?.full_name || user?.user_id || user?.role || "system"}`,
      old_data: oldAccount,
      changed_by: user?._id ? String(user._id) : undefined,
      changed_at: new Date().toISOString(),
    });
  } catch (e) {
    console.log("Audit log error:", e);
  }

  return { success: true };
}
