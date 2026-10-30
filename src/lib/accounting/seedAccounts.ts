import { Account } from "@/models/Account";
import { connectDB } from "@/integrations/mongodb/connection";

const DEFAULT_ACCOUNTS = [
  { code: "1100", name: "Cash", type: "asset", description: "Cash (parent account)" },
  { code: "1101", name: "Petty Cash", type: "asset", parentCode: "1100", description: "Petty cash on hand" },
  { code: "1102", name: "Bank Account", type: "asset", parentCode: "1100", description: "Main bank account" },
  { code: "1211", name: "Cash at Bank", type: "asset", description: "Cash at bank account" },
  { code: "1222", name: "Shares Receivable", type: "asset", description: "Share capital receivable (backward compat only)" },
  { code: "2101", name: "Member Contributions Payable", type: "liability", description: "Member contributions held in trust" },
  { code: "3101", name: "Share Capital", type: "equity", description: "Share capital equity" },
  { code: "4101", name: "Fine Income", type: "income", description: "Fine income" },
  { code: "4102", name: "Donation Income", type: "income", description: "Donation income" },
  { code: "5100", name: "Operating Expenses", type: "expense", description: "Operating expenses (parent account)" },
  { code: "5101", name: "Office Expense", type: "expense", parentCode: "5100", description: "Office supplies and expense" },
  { code: "5102", name: "Rent Expense", type: "expense", parentCode: "5100", description: "Rent expense" },
];

export async function seedAccounts(): Promise<{ data: typeof DEFAULT_ACCOUNTS; count: number }> {
  await connectDB();
  const AccountModel = Account as any;
  const byCode = new Map<string, any>();
  for (const acc of DEFAULT_ACCOUNTS) {
    const existing = await AccountModel.findOne({ code: acc.code }).lean();
    if (existing) {
      byCode.set(acc.code, existing);
      continue;
    }
    const doc = await AccountModel.create({
      code: acc.code,
      name: acc.name,
      type: acc.type,
      parentAccount: null,
      description: acc.description || "",
      balance: 0,
      isActive: true,
    });
    byCode.set(acc.code, doc);
  }
  for (const acc of DEFAULT_ACCOUNTS) {
    if (!acc.parentCode) continue;
    const existing = await AccountModel.findOne({ code: acc.code }).lean();
    const parent = byCode.get(acc.parentCode);
    if (!parent || !existing) continue;
    if (String(existing.parentAccount) === String(parent._id)) continue;
    await AccountModel.updateOne({ code: acc.code }, { parentAccount: parent._id });
  }
  return { data: DEFAULT_ACCOUNTS, count: DEFAULT_ACCOUNTS.length };
}
