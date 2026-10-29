import { NextRequest, NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/authenticaiton/verifications";
import { getTransactions, createTransaction } from "@/lib/accounting/transactions";
import { connectDB } from "@/integrations/mongodb/connection";
import { AuditLog } from "@/integrations/mongodb/models/AuditLog";

const ADMIN_ROLES = ["admin", "president", "director"];

function getSortOrder(order: string | null): 1 | -1 {
  return order === "asc" ? 1 : -1;
}

export async function GET(req: NextRequest) {
  await getCurrentMember(req);
  const { searchParams } = new URL(req.url);
  const filters: any = {};
  const dateFrom = searchParams.get("dateFrom") || searchParams.get("date_from");
  const dateTo = searchParams.get("dateTo") || searchParams.get("date_to");
  if (dateFrom || dateTo) {
    filters.dateFrom = dateFrom;
    filters.dateTo = dateTo;
  }
  const order = searchParams.get("order");
  if (order) filters.order = order;
  const memberId = searchParams.get("member_id") || searchParams.get("member");
  if (memberId) filters.member = memberId;
  const status = searchParams.get("status");
  if (status) filters.status = status;
  const search = searchParams.get("search");
  if (search) filters.search = search;
  const page = searchParams.get("page");
  const limit = searchParams.get("limit");
  if (page) filters.page = Number(page);
  if (limit) filters.limit = Number(limit);

  try {
    const result = await getTransactions(filters);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to fetch journal entries" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentMember(req, ADMIN_ROLES);
  if (user instanceof NextResponse) return user;
  if (!user) {
    return NextResponse.json(
      { error: "Access Denied! Only Admin, President and Director can create journal entries" },
      { status: 403 },
    );
  }

  await connectDB();
  const body = await req.json();
  const { type, lines, ...data } = body;
  try {
    const entry = await createTransaction({ ...data, lines });
    
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
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to create journal entry" },
      { status: 400 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentMember(req, ADMIN_ROLES);
  if (user instanceof NextResponse) return user;
  if (!user) {
    return NextResponse.json(
      { error: "Access Denied! Only Admin, President and Director can update journal entries" },
      { status: 403 },
    );
  }

  await connectDB();
  const body = await req.json();
  const { id, ...updateData } = body;
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  try {
    const { JournalEntry } = await import("@/models/JournalEntry");
    const JournalEntryModel = JournalEntry as any;
    const oldEntry = await JournalEntryModel.findById(id).lean();
    
    const entry = await JournalEntryUpdate(id, updateData);
    
    await AuditLog.create({
      table_name: "JournalEntry",
      record_id: String(id),
      action: "UPDATE",
      description: `Journal entry updated by ${user?.full_name || user?.user_id || user?.role}`,
      old_data: oldEntry,
      new_data: entry,
      changed_by: String(user?._id),
      changed_at: new Date().toISOString(),
    });
    
    return NextResponse.json({ data: entry });
  } catch (error) {
    const status = (error as Error)?.message === "Journal entry not found" ? 404 : 400;
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to update journal entry" },
      { status },
    );
  }
}

async function JournalEntryUpdate(id: string, data: any) {
  const { connectDB } = await import("@/integrations/mongodb/connection");
  const { JournalEntry } = await import("@/models/JournalEntry");
  await connectDB();
  const JournalEntryModel = JournalEntry as any;
  const entry = await JournalEntryModel.findByIdAndUpdate(id, data, { new: true }).lean();
  if (!entry) {
    throw new Error("Journal entry not found");
  }
  return entry;
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentMember(req, ADMIN_ROLES);
  if (user instanceof NextResponse) return user;
  if (!user) {
    return NextResponse.json(
      { error: "Access Denied! Only Admin, President and Director can delete journal entries" },
      { status: 403 },
    );
  }

  await connectDB();
  const body = await req.json();
  const { id, type } = body;
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  try {
    const { JournalEntry } = await import("@/models/JournalEntry");
    const JournalEntryModel = JournalEntry as any;
    const oldEntry = await JournalEntryModel.findById(id).lean();
    
    const entry = await JournalEntryModel.findByIdAndDelete(id);
    if (!entry) {
      return NextResponse.json({ error: "Journal entry not found" }, { status: 404 });
    }
    
    await AuditLog.create({
      table_name: "JournalEntry",
      record_id: String(id),
      action: "DELETE",
      description: `Journal entry deleted: ${oldEntry?.reference || id} by ${user?.full_name || user?.user_id || user?.role}`,
      old_data: oldEntry,
      changed_by: String(user?._id),
      changed_at: new Date().toISOString(),
    });
    
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to delete journal entry" },
      { status: 400 },
    );
  }
}
