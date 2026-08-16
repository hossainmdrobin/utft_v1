import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/integrations/mongodb/connection";
import { JournalEntryLine } from "@/models/JournalEntryLine";

export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);

  const filter: Record<string, unknown> = {};

  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  if (dateFrom || dateTo) {
    filter.created_at = {} as Record<string, unknown>;
    if (dateFrom) (filter.created_at as Record<string, unknown>).$gte = new Date(dateFrom);
    if (dateTo) (filter.created_at as Record<string, unknown>).$lte = new Date(dateTo);
  }

  const accountId = searchParams.get("account_id");
  if (accountId) filter.account_id = accountId;

  const memberId = searchParams.get("member_id");
  if (memberId) filter.member_id = memberId;

  try {
    const lines = await JournalEntryLine.find(filter).sort({ created_at: -1 }).lean();
    return NextResponse.json({ data: lines, count: lines.length });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to fetch journal entry lines" },
      { status: 500 }
    );
  }
}
