import { NextRequest, NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/authenticaiton/verifications";
import { getAccounts, createAccount } from "@/lib/accounting/accounts";

const ADMIN_ROLES = ["admin", "president", "director"];

export async function GET(req: NextRequest) {
  await getCurrentMember(req);
  const { searchParams } = new URL(req.url);
  const filters: any = {};
  const type = searchParams.get("type");
  if (type) filters.type = type;
  const isActive = searchParams.get("isActive");
  if (isActive !== null) filters.isActive = isActive === "true";
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
  try {
    const account = await createAccount(body);
    return NextResponse.json({ data: account }, { status: 201 });
  } catch (error) {
    const status = (error as Error)?.message === "Account code already exists" ? 409 : 400;
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to create account" },
      { status },
    );
  }
}
