import { connectDB, mongoose } from "@/integrations/mongodb/connection";
import { Setting } from "@/integrations/mongodb/models/Setting";
import { Installment } from "@/models/Installment";
import { JournalEntry } from "@/models/JournalEntry";
import { Account } from "@/models/Account";
import { Types } from "mongoose";
import { createTransaction } from "@/lib/accounting/transactions";

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
  if (typeof input !== "string") {
    throw new Error(`${fieldName} must be a string`);
  }
  if (!Types.ObjectId.isValid(input)) {
    throw new Error(`${fieldName} must be a valid ObjectId`);
  }
  return input;
}

export async function postInstallmentPayment(input: PostInstallmentPaymentInput): Promise<PostInstallmentPaymentResult> {
  await connectDB();
  const session = await mongoose.startSession();
  let result: PostInstallmentPaymentResult | null = null;
  try {
    await session.withTransaction(async () => {
      const amount = Number(input.amount);
      if (!amount || amount <= 0) {
        throw new Error("Installment amount must be greater than zero");
      }

      const setting = await SettingModel.findOne({}).sort({ created_at: 1 }).lean().session(session);
      if (!setting?.installmentAccounting?.debitAccount || !setting?.installmentAccounting?.creditAccount) {
        throw new Error("Installment accounting is not configured. Set debit and credit accounts in Settings.");
      }

      const debitId = parseObjectId(setting.installmentAccounting.debitAccount, "installmentAccounting.debitAccount");
      const creditId = parseObjectId(setting.installmentAccounting.creditAccount, "installmentAccounting.creditAccount");
      if (debitId === creditId) {
        throw new Error("Debit and credit accounts must be different");
      }

      const [debitAcc, creditAcc] = await Promise.all([
        AccountModel.findById(debitId).session(session).lean(),
        AccountModel.findById(creditId).session(session).lean(),
      ]);
      if (!debitAcc) {
        throw new Error("installmentAccounting.debitAccount not found");
      }
      if (!creditAcc) {
        throw new Error("installmentAccounting.creditAccount not found");
      }
      if (!debitAcc.isActive) {
        throw new Error("installmentAccounting.debitAccount must be active");
      }
      if (!creditAcc.isActive) {
        throw new Error("installmentAccounting.creditAccount must be active");
      }
      if (debitAcc.type !== "asset") {
        throw new Error("installmentAccounting.debitAccount type must be asset");
      }
      if (creditAcc.type !== "liability" && creditAcc.type !== "equity") {
        throw new Error("installmentAccounting.creditAccount type must be liability or equity");
      }

      let installmentDoc: any;
      let reference: string;

      if (input.action === "update") {
        if (!input.installmentId) {
          throw new Error("installmentId is required for update action");
        }
        reference = parseObjectId(input.installmentId, "installmentId");

        const existingEntry = await JournalEntryModel.findOne({ reference, status: "posted" }).session(session).lean();
        if (existingEntry) {
          result = { journalEntry: existingEntry, installment: null, isDuplicate: true };
          return;
        }

        const current = await InstallmentModel.findById(input.installmentId).session(session).lean();
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
          { session, new: true },
        );
      } else {
        const paidAt = input.paid_at || new Date().toISOString();
        installmentDoc = await InstallmentModel.create(
          {
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
          },
          { session },
        );
        reference = String(installmentDoc._id);

        const existingEntry = await JournalEntryModel.findOne({ reference, status: "posted" }).session(session).lean();
        if (existingEntry) {
          result = { journalEntry: existingEntry, installment: installmentDoc, isDuplicate: true };
          return;
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

      result = { journalEntry, installment: installmentDoc, isDuplicate: false };
    });
  } finally {
    await session.endSession();
  }
  if (!result) {
    throw new Error("Transaction failed to produce a result");
  }
  return result;
}
