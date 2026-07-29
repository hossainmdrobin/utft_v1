import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/integrations/mongodb/connection";
import { Member } from "@/models/member";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();
  const { id } = await params;

  try {
    const member = await Member.findById(id)
      .populate("createdBy", "full_name user_id role")
      .lean();

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    return NextResponse.json({ data: member });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to fetch member" },
      { status: 500 }
    );
  }
}