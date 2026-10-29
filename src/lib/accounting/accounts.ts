import { Account } from "@/models/Account";
import { JournalEntry } from "@/models/JournalEntry";
import { connectDB } from "@/integrations/mongodb/connection";
import { AuditLog } from "@/integrations/mongodb/models/AuditLog";

const AccountModel = Account as any;
const JournalEntryModel = JournalEntry as any;

export interface AccountFilters {
  type?: string;
  isActive?: boolean;
  search?: string;
}

export async function getAccounts(filters: AccountFilters = {}) {
  await connectDB();
  const { type, isActive, search } = filters;
  const filter: Record<string, any> = {};
  if (type) filter.type = type;
  if (isActive !== undefined) filter.isActive = isActive;
  if (search) {
    const regex = new RegExp(search, "i");
    filter.$or = [{ name: regex }, { code: regex }];
  }
  const accounts = await AccountModel.find(filter).sort({ code: 1, name: 1 }).lean();
  return { data: accounts, count: accounts.length };
}

export async function createAccount(data: any, user?: any) {
  await connectDB();
  const { code, name, type, parentAccount, description } = data;
  if (!name || !type) {
    throw new Error("Account name and type are required");
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
