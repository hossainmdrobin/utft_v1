import { NextRequest, NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/authenticaiton/verifications";
import { getAccounts, createAccount, updateAccount, deleteAccount } from "@/lib/accounting/accounts";

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
    return NextResponse.json({ data: account }, { status: 201 });
  } catch (error) {
    const status = (error as Error)?.message === "Account code already exists" ? 409 : 400;
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to create account" },
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

  const body = await req.json();
  const { id, ...updateData } = body;
  if (!id) {
    return NextResponse.json({ error: "Account id is required" }, { status: 400 });
  }
  try {
    const account = await updateAccount(id, updateData);
    return NextResponse.json({ data: account });
  } catch (error) {
    const status = (error as Error)?.message === "Account not found" ? 404 : 400;
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to update account" },
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

  const body = await req.json();
  const { id } = body;
  if (!id) {
    return NextResponse.json({ error: "Account id is required" }, { status: 400 });
  }
  try {
    await deleteAccount(id);
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
