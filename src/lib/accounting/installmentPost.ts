import { connectDB, mongoose } from "@/integrations/mongodb/connection";
import { Setting } from "@/integrations/mongodb/models/Setting";
import { Installment } from "@/models/Installment";
import { JournalEntry } from "@/models/JournalEntry";
import { Account } from "@/models/Account";
import { Types } from "mongoose";
import { createTransaction } from "@/lib/accounting/transactions";
import { seedAccounts } from "@/lib/accounting/seedAccounts";

const AccountModel = Account as any;
const InstallmentModel = Installment as any;
const JournalEntryModel = JournalEntry as any;
const SettingModel = Setting as any;

export type PostInstallmentPaymentAction = "create" | "update";

export interface PostInstallmentPaymentInput {
  action: PostInstallmentPaymentAction;
  member: string;
  amount: number;
  date: string;
  description: string;
  user: any;
  installmentId?: string;
  month?: number;
  year?: number;
  day?: number;
  status?: string;
  payment_status?: string;
  method?: string;
  paid_at?: string;
  transaction_id?: string;
  currency?: string;
  account?: string;
}

export interface PostInstallmentPaymentResult {
  journalEntry: any;
  installment: any;
  isDuplicate: boolean;
}

function parseObjectId(input: unknown, fieldName: string): string {
  if (input instanceof Types.ObjectId) {
    return input.toString();
  }
  if (typeof input === "object" && input !== null && "_id" in input) {
    return String((input as any)._id);
  }
  if (typeof input !== "string") {
    throw new Error(`${fieldName} must be a string or ObjectId`);
  }
  if (!Types.ObjectId.isValid(input)) {
    throw new Error(`${fieldName} must be a valid ObjectId`);
  }
  return input;
}

function isStandaloneMongoError(err: any): boolean {
  if (!err) return false;
  const msg = String(err.message || "");
  return (
    err.code === 20 ||
    err.codeName === "IllegalOperation" ||
    msg.includes("Transaction numbers are only allowed on a replica set member or mongos") ||
    msg.includes("does not support retryable writes") ||
    msg.includes("transactions are not supported") ||
    msg.includes("replica set member or mongos")
  );
}

async function resolveInstallmentAccounts(session?: any): Promise<{ debitId: string; creditId: string }> {
  const settingQuery = SettingModel.findOne({}).sort({ created_at: 1 });
  if (session) settingQuery.session(session);
  const setting = await settingQuery.lean();

  let debitId: string | null = null;
  let creditId: string | null = null;

  if (setting?.installmentAccounting?.debitAccount && setting?.installmentAccounting?.creditAccount) {
    try {
      const parsedDebit = parseObjectId(setting.installmentAccounting.debitAccount, "installmentAccounting.debitAccount");
      const parsedCredit = parseObjectId(setting.installmentAccounting.creditAccount, "installmentAccounting.creditAccount");
      if (parsedDebit !== parsedCredit) {
        const debitQuery = AccountModel.findById(parsedDebit);
        const creditQuery = AccountModel.findById(parsedCredit);
        if (session) {
          debitQuery.session(session);
          creditQuery.session(session);
        }
        const [debitAcc, creditAcc] = await Promise.all([debitQuery.lean(), creditQuery.lean()]);
        if (
          debitAcc &&
          creditAcc &&
          debitAcc.isActive &&
          creditAcc.isActive &&
          debitAcc.type === "asset" &&
          (creditAcc.type === "liability" || creditAcc.type === "equity")
        ) {
          debitId = parsedDebit;
          creditId = parsedCredit;
        }
      }
    } catch {
      // Fall back to default accounts
    }
  }

  if (debitId && creditId) {
    return { debitId, creditId };
  }

  // Fallback to default accounts: 1211 (Cash at Bank) and 2101 (Member Contributions Payable)
  const defaultDebitQuery = AccountModel.findOne({ code: "1211" });
  const defaultCreditQuery = AccountModel.findOne({ code: "2101" });
  if (session) {
    defaultDebitQuery.session(session);
    defaultCreditQuery.session(session);
  }
  const [defaultDebit, defaultCredit] = await Promise.all([
    defaultDebitQuery.lean(),
    defaultCreditQuery.lean(),
  ]);

  if (!defaultDebit) {
    throw new Error("Default debit account (code 1211: Cash at Bank) not found");
  }
  if (!defaultCredit) {
    throw new Error("Default credit account (code 2101: Member Contributions Payable) not found");
  }

  debitId = String(defaultDebit._id);
  creditId = String(defaultCredit._id);

  // Link to setting so subsequent operations are permanently linked
  try {
    if (setting?._id) {
      await SettingModel.findByIdAndUpdate(
        setting._id,
        {
          installmentAccounting: {
            debitAccount: defaultDebit._id,
            creditAccount: defaultCredit._id,
          },
        },
        session ? { session } : undefined,
      );
    } else {
      const newSetting = new SettingModel({
        installmentAccounting: {
          debitAccount: defaultDebit._id,
          creditAccount: defaultCredit._id,
        },
      });
      await newSetting.save(session ? { session } : undefined);
    }
  } catch (err) {
    console.warn("Could not persist default installment accounting settings:", err);
  }

  return { debitId, creditId };
}

async function executeInstallmentWork(
  input: PostInstallmentPaymentInput,
  session?: any,
): Promise<PostInstallmentPaymentResult> {
  const amount = Number(input.amount);
  if (!amount || amount <= 0) {
    throw new Error("Installment amount must be greater than zero");
  }

  const { debitId, creditId } = await resolveInstallmentAccounts(session);

  let installmentDoc: any;
  let reference: string;

  if (input.action === "update") {
    if (!input.installmentId) {
      throw new Error("installmentId is required for update action");
    }
    reference = parseObjectId(input.installmentId, "installmentId");

    const existingEntryQuery = JournalEntryModel.findOne({ reference, status: "posted" });
    if (session) existingEntryQuery.session(session);
    const existingEntry = await existingEntryQuery.lean();
    if (existingEntry) {
      return { journalEntry: existingEntry, installment: null, isDuplicate: true };
    }

    const currentQuery = InstallmentModel.findById(input.installmentId);
    if (session) currentQuery.session(session);
    const current = await currentQuery.lean();
    if (!current) {
      throw new Error("Installment not found");
    }
    if (current.payment_status === "paid") {
      throw new Error("Installment is already paid");
    }

    installmentDoc = await InstallmentModel.findByIdAndUpdate(
      input.installmentId,
      {
        payment_status: "paid",
        paid_at: input.paid_at || new Date().toISOString(),
        status: input.status || "paid",
        updated_by: input.user?._id || input.user?.id,
      },
      { session: session || undefined, new: true },
    );
  } else {
    // Check if installment already exists for this member and period
    let existingInstallment: any = null;
    if (input.month && input.year && input.member) {
      const findQuery = InstallmentModel.findOne({
        member: input.member,
        month: input.month,
        year: input.year,
      });
      if (session) findQuery.session(session);
      existingInstallment = await findQuery;
    }

    if (existingInstallment) {
      installmentDoc = existingInstallment;
      reference = String(installmentDoc._id);
    } else {
      const paidAt = input.paid_at || new Date().toISOString();
      const newInstallment = new InstallmentModel({
        member: input.member,
        amount,
        date: input.date || new Date(),
        payment_status: "paid",
        paid_at: paidAt,
        status: input.status || "regular",
        created_by: input.user?._id || input.user?.id,
        month: input.month,
        year: input.year,
        day: input.day,
        description: input.description || "",
        method: input.method,
        transaction_id: input.transaction_id,
        currency: input.currency,
        account: input.account,
      });
      installmentDoc = await newInstallment.save(session ? { session } : undefined);
      reference = String(installmentDoc._id);
    }

    const existingEntryQuery = JournalEntryModel.findOne({ reference, status: "posted" });
    if (session) existingEntryQuery.session(session);
    const existingEntry = await existingEntryQuery.lean();
    if (existingEntry) {
      return { journalEntry: existingEntry, installment: installmentDoc, isDuplicate: true };
    }
  }

  const memberId = input.member ? (Types.ObjectId.isValid(input.member) ? input.member : undefined) : undefined;

  const lines = [
    { account: debitId, debit: amount, credit: 0 },
    { account: creditId, debit: 0, credit: amount },
  ];

  const journalEntry = await createTransaction(
    {
      date: input.date || new Date(),
      reference,
      member: memberId,
      description: input.description || "Installment payment",
      lines,
      status: "posted",
    },
    input.user,
    session,
  );

  return { journalEntry, installment: installmentDoc, isDuplicate: false };
}

export async function postInstallmentPayment(input: PostInstallmentPaymentInput): Promise<PostInstallmentPaymentResult> {
  await connectDB();
  await seedAccounts();

  let session: any = null;
  try {
    session = await mongoose.startSession();
  } catch (err: any) {
    if (isStandaloneMongoError(err)) {
      return await executeInstallmentWork(input, undefined);
    }
    throw err;
  }

  let result: PostInstallmentPaymentResult | null = null;
  try {
    await session.withTransaction(async () => {
      result = await executeInstallmentWork(input, session);
    });
  } catch (err: any) {
    if (isStandaloneMongoError(err)) {
      result = await executeInstallmentWork(input, undefined);
    } else {
      throw err;
    }
  } finally {
    await session.endSession();
  }

  if (!result) {
    throw new Error("Transaction failed to produce a result");
  }
  return result;
}
