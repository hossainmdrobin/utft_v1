import { Account } from "@/models/Account";
import { connectDB } from "@/integrations/mongodb/connection";

const DEFAULT_ACCOUNTS = [
  { code: "1211", name: "Cash at Bank", type: "asset", description: "Cash at bank account" },
  { code: "1222", name: "Shares Receivable", type: "asset", description: "Share capital receivable (backward compat only)" },
  { code: "2101", name: "Member Contributions Payable", type: "liability", description: "Member contributions held in trust" },
  { code: "3101", name: "Share Capital", type: "equity", description: "Share capital equity" },
  { code: "4101", name: "Fine Income", type: "income", description: "Fine income" },
  { code: "4102", name: "Donation Income", type: "income", description: "Donation income" },
];

export async function seedAccounts(): Promise<{ data: typeof DEFAULT_ACCOUNTS; count: number }> {
  await connectDB();
  const AccountModel = Account as any;
  for (const acc of DEFAULT_ACCOUNTS) {
    const existing = await AccountModel.findOne({ code: acc.code }).lean();
    if (!existing) {
      await AccountModel.create({
        code: acc.code,
        name: acc.name,
        type: acc.type,
        description: acc.description || "",
        balance: 0,
        isActive: true,
      });
    }
  }
  return { data: DEFAULT_ACCOUNTS, count: DEFAULT_ACCOUNTS.length };
}
