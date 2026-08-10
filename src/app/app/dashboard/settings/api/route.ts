import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/integrations/mongodb/connection";
import { Setting } from "@/integrations/mongodb/models/Setting";

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
  await connectDB();
  const body = await req.json();

  try {
    const setting = await getOrCreateSetting();
    const updated = await Setting.findByIdAndUpdate(setting._id, body, { new: true }).lean();
    return NextResponse.json({ data: updated });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to update settings" },
      { status: 400 }
    );
  }
}
