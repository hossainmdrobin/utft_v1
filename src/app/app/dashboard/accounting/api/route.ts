import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/integrations/mongodb/connection";
import { getCurrentMember } from "@/lib/authenticaiton/verifications";
import { Activity } from "@/models/activities";
import { Account } from "@/models/Account";

// GET all accounts with optional filtering
export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);

  const filter: any = {};

  const accountType = searchParams.get("account_type");
  if (accountType) filter.account_type = accountType;

  const isActive = searchParams.get("is_active");
  if (isActive !== null) filter.is_active = isActive === "true";

  const isContra = searchParams.get("is_contra");
  if (isContra !== null) filter.is_contra = isContra === "true";

  const search = searchParams.get("search");
  if (search) {
    const regex = new RegExp(search, "i");
    filter.$or = [{ name: regex }, { code: regex }];
  }

  try {
    const accounts = await Account.find(filter).sort({ code: 1 }).lean();
    return NextResponse.json({ data: accounts, count: accounts.length });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to fetch accounts" },
      { status: 500 }
    );
  }
}

// POST create a new account
export async function POST(req: NextRequest) {
  await connectDB();
  const user = await getCurrentMember(req, ["admin", "president", "director"]);
  if (!user) {
    return NextResponse.json(
      { error: "Access Denied! Only Admin, President and Director can add accounts" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { name, code, account_type, description, opening_balance, parent_account_id, is_contra, parent_id } = body;

  if (!name || !code || !account_type) {
    return NextResponse.json(
      { error: "Name, code, and account_type are required" },
      { status: 400 }
    );
  }

  try {
    const existingAccount = await Account.findOne({ code });
    if (existingAccount) {
      return NextResponse.json(
        { error: "Account code already exists" },
        { status: 409 }
      );
    }

    const newAccount = await Account.create({
      name,
      code,
      account_type,
      description: description || "",
      opening_balance: opening_balance || 0,
      current_balance: opening_balance || 0,
      parent_account_id: parent_account_id || null,
      parent_id: parent_id || null,
      is_contra: is_contra || false,
      created_by: user._id,
    });

    await Activity.create({
      table_name: "Account",
      record_id: newAccount._id,
      description: `Account created with code: ${code}`,
      action: "create",
    });

    return NextResponse.json({ data: newAccount }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to create account" },
      { status: 400 }
    );
  }
}

// PATCH update an existing account
export async function PATCH(req: NextRequest) {
  await connectDB();
  const user = await getCurrentMember(req);
  if (!user) {
    return NextResponse.json({ error: "Access Denied" }, { status: 403 });
  }

  const body = await req.json();
  const { id, ...updateData } = body;

  if (!id) {
    return NextResponse.json({ error: "Account id is required" }, { status: 400 });
  }

  try {
    const oldAccount = await Account.findById(id);
    if (!oldAccount) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const account = await Account.findByIdAndUpdate(id, updateData, { new: true }).lean();

    await Activity.create({
      table_name: "Account",
      record_id: account._id,
      description: `Account updated: ${account.code}`,
      action: "update",
    });

    return NextResponse.json({ data: account });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to update account" },
      { status: 400 }
    );
  }
}

// DELETE remove an account
export async function DELETE(req: NextRequest) {
  await connectDB();
  const user = await getCurrentMember(req, ["admin", "president", "director"]);
  if (!user) {
    return NextResponse.json(
      { error: "Access Denied! Only Admin, President and Director can delete accounts" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: "Account id is required" }, { status: 400 });
  }

  try {
    const account = await Account.findByIdAndDelete(id);
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    await Activity.create({
      table_name: "Account",
      record_id: account._id,
      description: `Account deleted: ${account.code}`,
      action: "delete",
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to delete account" },
      { status: 400 }
    );
  }
}