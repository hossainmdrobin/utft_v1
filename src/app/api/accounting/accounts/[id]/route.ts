import { NextRequest, NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/authenticaiton/verifications";
import { updateAccount, deleteAccount } from "@/lib/accounting/accounts";

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

  const { id } = await params;
  const body = await req.json();
  try {
    const account = await updateAccount(id, body);
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

  const { id } = await params;
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
