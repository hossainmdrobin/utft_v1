import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/integrations/mongodb/connection";
import { Setting } from "@/integrations/mongodb/models/Setting";
import { getCurrentMember } from "@/lib/authenticaiton/verifications";
import { AuditLog } from "@/integrations/mongodb/models/AuditLog";
import { Account } from "@/models/Account";
import { Types } from "mongoose";

const AccountModel = Account as any;

export const dynamic = "force-dynamic";

async function getOrCreateSetting() {
  await connectDB();
  let setting = await Setting.findOne({}).sort({ created_at: 1 }).lean();
  if (!setting) {
    setting = await Setting.create({});
  }
  const count = await Setting.countDocuments({});
  if (count > 1) {
    await Setting.deleteMany({ _id: { $ne: setting._id } });
  }
  return setting;
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

async function validateInstallmentAccountingPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    throw new Error("installmentAccounting must be an object");
  }

  const { debitAccount, creditAccount } = payload as {
    debitAccount?: unknown;
    creditAccount?: unknown;
  };
  if (!debitAccount) throw new Error("installmentAccounting.debitAccount is required");
  if (!creditAccount) throw new Error("installmentAccounting.creditAccount is required");

  const debitAccountId = parseObjectId(debitAccount, "installmentAccounting.debitAccount");
  const creditAccountId = parseObjectId(creditAccount, "installmentAccounting.creditAccount");

  if (debitAccountId === creditAccountId) {
    throw new Error("Debit and credit accounts must be different");
  }

  const [debitAcc, creditAcc] = await Promise.all([
    AccountModel.findById(debitAccountId).lean(),
    AccountModel.findById(creditAccountId).lean(),
  ]);

  if (!debitAcc) throw new Error("installmentAccounting.debitAccount not found");
  if (!creditAcc) throw new Error("installmentAccounting.creditAccount not found");
  if (!debitAcc.isActive) throw new Error("installmentAccounting.debitAccount must be active");
  if (!creditAcc.isActive) throw new Error("installmentAccounting.creditAccount must be active");

  if (debitAcc.type !== "asset") {
    throw new Error("installmentAccounting.debitAccount type must be asset");
  }

  if (creditAcc.type !== "liability" && creditAcc.type !== "equity") {
    throw new Error("installmentAccounting.creditAccount type must be liability or equity");
  }
}

export async function GET(req: NextRequest) {
  try {
    const setting = await getOrCreateSetting();
    return NextResponse.json({ data: setting });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to fetch settings" },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentMember(req);
  if (user instanceof NextResponse) return user;

  await connectDB();
  const body: Record<string, unknown> = await req.json();

  try {
    if (Object.prototype.hasOwnProperty.call(body, "installmentAccounting")) {
      await validateInstallmentAccountingPayload(body.installmentAccounting);
    }

    const setting = await getOrCreateSetting();
    const oldData = { ...setting };
    const updated = await Setting.findByIdAndUpdate(setting._id, body, { new: true }).lean();
    try {
      await AuditLog.create({
        table_name: "Setting",
        record_id: String(setting._id),
        action: "UPDATE",
        description: `Setting updated by ${user.full_name || user.user_id || user.role}`,
        old_data: oldData,
        new_data: updated,
        changed_by: String(user._id),
        changed_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error("Audit log error:", e);
    }
    return NextResponse.json({ data: updated });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to update settings" },
      { status: 400 }
    );
  }
}
