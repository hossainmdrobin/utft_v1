import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/integrations/mongodb/connection";
import { AuditLog } from "@/integrations/mongodb/models/AuditLog";
import { getCurrentMember } from "@/lib/authenticaiton/verifications";

export async function GET(req: NextRequest) {
  await connectDB();
  const member = await getCurrentMember(req);
  if (!member || member?.status) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const logs = await AuditLog.find({ is_deleted: false })
    .sort({ changed_at: -1 })
    .limit(500)
    .lean();
  return NextResponse.json({ data: logs });
}

export async function POST(req: NextRequest) {
  await connectDB();
  const member = await getCurrentMember(req, ["admin"]);
  if (!member || member?.status) {
    return NextResponse.json({ error: "Access Denied" }, { status: 403 });
  }
  const body = await req.json();
  const ids: string[] = body?.ids;
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids required" }, { status: 400 });
  }

  await AuditLog.create({
    table_name: "audit_logs",
    record_id: "bulk-delete",
    action: "DELETE",
    action_type: "log_deletion",
    description: `Deleted ${ids.length} log entries`,
    changed_by: String(member._id),
    new_data: { deleted_count: ids.length, deleted_ids: ids.slice(0, 10) },
  });

  for (const id of ids) {
    await AuditLog.findByIdAndUpdate(id, {
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: String(member._id),
    });
  }

  return NextResponse.json({ data: { success: true } });
}
