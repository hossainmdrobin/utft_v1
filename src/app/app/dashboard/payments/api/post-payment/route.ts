import { NextRequest, NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/authenticaiton/verifications";
import { postPayment } from "@/lib/accounting/autoPost";
import { connectDB } from "@/integrations/mongodb/connection";
import { AuditLog } from "@/integrations/mongodb/models/AuditLog";

export async function POST(req: NextRequest) {
  const user = await getCurrentMember(req);
  if (user instanceof NextResponse) return user;
  if (!user) {
    return NextResponse.json({ error: "Access Denied" }, { status: 403 });
  }

  await connectDB();
  const body = await req.json();
  const { sourceType, sourceId, paymentReference, memberId, paymentDate, amount, description, lines } = body;

  if (!sourceType || !sourceId || !memberId || !amount || !description) {
    return NextResponse.json({ error: "sourceType, sourceId, memberId, amount, and description are required" }, { status: 400 });
  }

  try {
    const result = await postPayment({
      sourceType,
      sourceId,
      paymentReference,
      memberId,
      paymentDate,
      amount,
      description,
      user: {
        _id: user._id,
        id: user.id,
        full_name: user.full_name,
        user_id: user.user_id,
        role: user.role,
      },
      lines,
    });

    try {
      await AuditLog.create({
        table_name: "JournalEntry",
        record_id: String((result.journalEntry as any)._id),
        action: "INSERT",
        description: `Payment posted to ledger: ${result.journalEntry.reference} by ${user.full_name || user.user_id || user.role} (${result.isDuplicate ? "duplicate" : "new"})`,
        changed_by: String(user._id),
        changed_at: new Date().toISOString(),
        new_data: result.journalEntry,
      });
    } catch (e) {
      console.log("Audit log error:", e);
    }

    return NextResponse.json({ data: { journalEntry: result.journalEntry, isDuplicate: result.isDuplicate } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error)?.message || "Failed to post payment" }, { status: 400 });
  }
}
