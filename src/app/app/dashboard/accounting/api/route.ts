import { NextRequest, NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/authenticaiton/verifications";
import { getAccounts, createAccount, updateAccount, deleteAccount } from "@/lib/accounting/accounts";
import { connectDB } from "@/integrations/mongodb/connection";
import { AuditLog } from "@/integrations/mongodb/models/AuditLog";

const ADMIN_ROLES = ["admin", "president", "director"];

export async function GET(req: NextRequest) {
  await getCurrentMember(req);
  const { searchParams } = new URL(req.url);
  const filters: any = {};
  const accountType = searchParams.get("account_type") || searchParams.get("type");
  if (accountType) filters.type = accountType;
  const isActive = searchParams.get("is_active") ?? searchParams.get("isActive");
  if (isActive !== null) filters.isActive = isActive === "true";
  const isContra = searchParams.get("is_contra");
  if (isContra !== null) filters.isActive = isContra === "true";
  const search = searchParams.get("search");
  if (search) filters.search = search;
  const tree = searchParams.get("tree");
  if (tree !== null) filters.tree = tree === "true";

  try {
    const result = await getAccounts(filters);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to fetch accounts" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentMember(req, ADMIN_ROLES);
  if (user instanceof NextResponse) return user;
  if (!user) {
    return NextResponse.json({ error: "Access Denied" }, { status: 403 });
  }

  await connectDB();
  const body = await req.json();
  const { code, name, account_type, description, opening_balance, parent_account_id, parent_id, is_contra } = body;
  if (!name || !account_type) {
    return NextResponse.json({ error: "Name and account_type are required" }, { status: 400 });
  }
  try {
    const account = await createAccount({
      code,
      name,
      type: account_type,
      parentAccount: parent_account_id || parent_id || null,
      description,
    });
    
    await AuditLog.create({
      table_name: "Account",
      record_id: String((account as any)._id),
      action: "INSERT",
      description: `Account created: ${(account as any).name} (${(account as any).code || "no code"}) by ${user?.full_name || user?.user_id || user?.role}`,
      changed_by: String(user?._id),
      changed_at: new Date().toISOString(),
      new_data: account,
    });
    
    return NextResponse.json({ data: account }, { status: 201 });
  } catch (error) {
    const message = (error as Error)?.message || "Failed to create account";
    const status =
      message === "Account code already exists" ||
      message === "Account cannot be its own parent" ||
      message === "Circular parent reference detected" ||
      message === "Parent account not found"
        ? 409
        : 400;
    return NextResponse.json(
      { error: message },
      { status },
    );
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentMember(req);
  if (user instanceof NextResponse) return user;
  if (!user) {
    return NextResponse.json({ error: "Access Denied" }, { status: 403 });
  }

  await connectDB();
  const body = await req.json();
  const { id, ...updateData } = body;
  if (!id) {
    return NextResponse.json({ error: "Account id is required" }, { status: 400 });
  }
  try {
    const { Account } = await import("@/models/Account");
    const AccountModel = Account as any;
    const oldAccount = await AccountModel.findById(id).lean();
    
    const account = await updateAccount(id, updateData);
    
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
    const message = (error as Error)?.message || "Failed to update account";
    const status =
      message === "Account not found"
        ? 404
        : message === "Account cannot be its own parent" ||
          message === "Circular parent reference detected" ||
          message === "Parent account not found"
          ? 409
          : 400;
    return NextResponse.json(
      { error: message },
      { status },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentMember(req, ADMIN_ROLES);
  if (user instanceof NextResponse) return user;
  if (!user) {
    return NextResponse.json({ error: "Access Denied" }, { status: 403 });
  }

  await connectDB();
  const body = await req.json();
  const { id } = body;
  if (!id) {
    return NextResponse.json({ error: "Account id is required" }, { status: 400 });
  }
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
    const message = (error as Error)?.message || "Failed to delete account";
    const status =
      message === "Cannot delete an account that has attached transactions" ||
      message === "Cannot delete an account that has child accounts"
        ? 409
        : message === "Account not found"
          ? 404
          : 400;
    return NextResponse.json(
      { error: message },
      { status },
    );
  }
}
