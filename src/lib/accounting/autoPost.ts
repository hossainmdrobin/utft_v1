import { connectDB } from "@/integrations/mongodb/connection";
import { Account } from "@/models/Account";
import { JournalEntry } from "@/models/JournalEntry";
import { createTransaction } from "@/lib/accounting/transactions";
import { seedAccounts } from "@/lib/accounting/seedAccounts";
import { getCurrentDhakaDate } from "@/lib/date/dhaka";

const AccountModel = Account as any;
const JournalEntryModel = JournalEntry as any;

const DEFAULT_CASH_CODE = "1211";

const CREDIT_ACCOUNT_BY_SOURCE: Record<string, { code: string; name: string; type: string }> = {
  installment: { code: "2101", name: "Member Contributions Payable", type: "liability" },
  share: { code: "3101", name: "Share Capital", type: "equity" },
  fine: { code: "4101", name: "Fine Income", type: "income" },
  donation: { code: "4102", name: "Donation Income", type: "income" },
  charge: { code: "2101", name: "Member Contributions Payable", type: "liability" },
};

const SOURCE_MODELS: Record<string, string> = {
  installment: "@/models/Installment",
  share: "@/integrations/mongodb/models/ShareReceivable",
  fine: "@/integrations/mongodb/models/FineTransaction",
  donation: "@/integrations/mongodb/models/MonthlyDonation",
  charge: "@/integrations/mongodb/models/MemberCharge",
};

export interface PostPaymentInput {
  sourceType: "installment" | "share" | "fine" | "donation" | "charge";
  sourceId: string;
  paymentReference?: string;
  memberId: string;
  paymentDate: Date | string;
  amount: number;
  description: string;
  user: { _id?: string; id?: string; full_name?: string; user_id?: string; role?: string };
  lines?: Array<{ accountId: string; debit: number; credit: number; description?: string }>;
}

export interface PostPaymentResult {
  journalEntry: any;
  isDuplicate: boolean;
}

function sourceMemberField(sourceType: string): string {
  return sourceType === "installment" ? "member" : "member_id";
}

export async function postPayment(input: PostPaymentInput): Promise<PostPaymentResult> {
  await connectDB();
  await seedAccounts();

  const { sourceType, sourceId, paymentReference, memberId, paymentDate, amount, description, user, lines: overrideLines } = input;

  if (!sourceType || !sourceId) {
    throw new Error("Source type and source ID are required");
  }
  if (!amount || Number(amount) <= 0) {
    throw new Error("Amount must be greater than zero");
  }
  if (!memberId) {
    throw new Error("Member ID is required");
  }
  if (!user || (!user._id && !user.id)) {
    throw new Error("User is required");
  }

  const modelPath = SOURCE_MODELS[sourceType];
  if (!modelPath) {
    throw new Error(`Unknown source type: ${sourceType}`);
  }

  const { default: SourceModel } = await import(modelPath);
  const sourceRecord = await SourceModel.findById(sourceId).lean();
  if (!sourceRecord) {
    throw new Error(`${sourceType} record not found: ${sourceId}`);
  }

  const memberField = sourceMemberField(sourceType);
  const sourceMember = sourceRecord[memberField];
  const sourceMemberStr = sourceMember ? String(sourceMember) : "";
  if (sourceMemberStr && sourceMemberStr !== String(memberId)) {
    throw new Error(`Member mismatch: source belongs to ${sourceMemberStr}, expected ${memberId}`);
  }

  const dhakaDate = getCurrentDhakaDate(paymentDate instanceof Date ? paymentDate : new Date(paymentDate));
  const dateStr = `${dhakaDate.year}-${String(dhakaDate.month).padStart(2, "0")}-${String(dhakaDate.day).padStart(2, "0")}`;
  const ref = paymentReference || Number(amount).toFixed(2);
  const idempotencyKey = `${sourceType}:${sourceId}:${ref}:${dateStr}`;

  const existing = await JournalEntryModel.findOne({ reference: idempotencyKey, status: "posted" }).lean();
  if (existing) {
    return { journalEntry: existing, isDuplicate: true };
  }

  let lines: Array<{ account: string; debit: number; credit: number; description?: string }>;
  if (overrideLines && overrideLines.length > 0) {
    lines = overrideLines.map((l) => ({
      account: l.accountId,
      debit: Number(l.debit) || 0,
      credit: Number(l.credit) || 0,
      description: l.description,
    }));
  } else {
    const creditInfo = CREDIT_ACCOUNT_BY_SOURCE[sourceType];
    if (!creditInfo) {
      throw new Error(`No default mapping for source type: ${sourceType}`);
    }

    const cashAccount = await AccountModel.findOne({ code: DEFAULT_CASH_CODE }).lean();
    const creditAccount = await AccountModel.findOne({ code: creditInfo.code }).lean();
    if (!cashAccount) {
      throw new Error(`Cash account not found: ${DEFAULT_CASH_CODE}`);
    }
    if (!creditAccount) {
      throw new Error(`Credit account not found: ${creditInfo.code}`);
    }

    lines = [
      { account: String(cashAccount._id), debit: Number(amount), credit: 0, description: `Cash at Bank - ${description}` },
      { account: String(creditAccount._id), debit: 0, credit: Number(amount), description: `${creditInfo.name} - ${description}` },
    ];
  }

  const entry = await createTransaction(
    {
      date: paymentDate,
      reference: idempotencyKey,
      member: memberId,
      description,
      lines,
      status: "posted",
    },
    user,
  );

  return { journalEntry: entry, isDuplicate: false };
}
