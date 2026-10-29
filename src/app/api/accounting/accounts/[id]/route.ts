import { NextRequest, NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/authenticaiton/verifications";
import { updateAccount, deleteAccount } from "@/lib/accounting/accounts";
import { connectDB } from "@/integrations/mongodb/connection";
import { AuditLog } from "@/integrations/mongodb/models/AuditLog";

const ADMIN_ROLES = ["admin", "president", "director"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentMember(req);
  if (user instanceof NextResponse) return user;
  if (!user) {
    return NextResponse.json({ error: "Access Denied" }, { status: 403 });
  }

  await connectDB();
  const { id } = await params;
  const body = await req.json();
  try {
    const { Account } = await import("@/models/Account");
    const AccountModel = Account as any;
    const oldAccount = await AccountModel.findById(id).lean();
    
    const account = await updateAccount(id, body);
    
    await AuditLog.create({
      table_name: "Account",
      record_id: String(id),
      action: "UPDATE",
      description: `Account updated by ${user?.full_name || user?.user_id || user?.role}`,
      old_data: oldAccount,
      new_data: account,
      changed_by: String(user?._id),
      changed_at: new Date().toISOString(),
    });
    
    return NextResponse.json({ data: account });
  } catch (error) {
    const status = (error as Error)?.message === "Account not found" ? 404 : 400;
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to update account" },
      { status },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentMember(req, ADMIN_ROLES);
  if (user instanceof NextResponse) return user;
  if (!user) {
    return NextResponse.json({ error: "Access Denied" }, { status: 403 });
  }

  await connectDB();
  const { id } = await params;
  try {
    const { Account } = await import("@/models/Account");
    const AccountModel = Account as any;
    const oldAccount = await AccountModel.findById(id).lean();
    
    await deleteAccount(id);
    
    await AuditLog.create({
      table_name: "Account",
      record_id: String(id),
      action: "DELETE",
      description: `Account deleted: ${oldAccount?.name || id} by ${user?.full_name || user?.user_id || user?.role}`,
      old_data: oldAccount,
      changed_by: String(user?._id),
      changed_at: new Date().toISOString(),
    });
    
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    const status =
      (error as Error)?.message === "Cannot delete an account that has attached transactions"
        ? 409
        : (error as Error)?.message === "Account not found"
          ? 404
          : 400;
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to delete account" },
      { status },
    );
  }
}
