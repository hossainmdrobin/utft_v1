import { NextRequest, NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/authenticaiton/verifications";
import { getTransactions, createTransaction } from "@/lib/accounting/transactions";
import { connectDB } from "@/integrations/mongodb/connection";
import { AuditLog } from "@/integrations/mongodb/models/AuditLog";

const ADMIN_ROLES = ["admin", "president", "director"];

export async function GET(req: NextRequest) {
  await getCurrentMember(req);
  const { searchParams } = new URL(req.url);
  const filters: any = {};
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const order = searchParams.get("order");
  const member = searchParams.get("member");
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const account = searchParams.get("account");
  const page = searchParams.get("page");
  const limit = searchParams.get("limit");
  if (dateFrom) filters.dateFrom = dateFrom;
  if (dateTo) filters.dateTo = dateTo;
  if (order) filters.order = order;
  if (member) filters.member = member;
  if (status) filters.status = status;
  if (search) filters.search = search;
  if (account) filters.account = account;
  if (page) filters.page = Number(page);
  if (limit) filters.limit = Number(limit);

  try {
    const result = await getTransactions(filters);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to fetch transactions" },
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
  try {
    const entry = await createTransaction(body);
    
    await AuditLog.create({
      table_name: "JournalEntry",
      record_id: String((entry as any)._id),
      action: "INSERT",
      description: `Journal entry created: ${(entry as any).reference || (entry as any)._id} by ${user?.full_name || user?.user_id || user?.role}`,
      changed_by: String(user?._id),
      changed_at: new Date().toISOString(),
      new_data: entry,
    });
    
    return NextResponse.json({ data: entry }, { status: 201 });
  } catch (error) {
    console.log(error)
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to create transaction" },
      { status: 400 },
    );
  }
}
