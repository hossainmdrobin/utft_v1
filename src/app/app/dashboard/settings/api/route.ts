import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/integrations/mongodb/connection";
import { Setting } from "@/integrations/mongodb/models/Setting";
import { getCurrentMember } from "@/lib/authenticaiton/verifications";
import { AuditLog } from "@/integrations/mongodb/models/AuditLog";

export const dynamic = "force-dynamic";

async function getOrCreateSetting() {
  await connectDB();
  let setting = await Setting.findOne({}).sort({ created_at: 1 }).lean();
  if (!setting) {
    setting = await Setting.create({});
  }
  const count = await Setting.countDocuments({});
  if (count > 1) {
    await Setting.deleteMany({ _id: { $ne: setting._id } });
  }
  return setting;
}

export async function GET(req: NextRequest) {
  try {
    const setting = await getOrCreateSetting();
    return NextResponse.json({ data: setting });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to fetch settings" },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentMember(req);
  if (user instanceof NextResponse) return user;

  await connectDB();
  const body = await req.json();

  try {
    const setting = await getOrCreateSetting();
    const oldData = { ...setting };
    const updated = await Setting.findByIdAndUpdate(setting._id, body, { new: true }).lean();
    try {
      await AuditLog.create({
        table_name: "Setting",
        record_id: String(setting._id),
        action: "UPDATE",
        description: `Setting updated by ${user.full_name || user.user_id || user.role}`,
        old_data: oldData,
        new_data: updated,
        changed_by: String(user._id),
        changed_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error("Audit log error:", e);
    }
    return NextResponse.json({ data: updated });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to update settings" },
      { status: 400 }
    );
  }
}
