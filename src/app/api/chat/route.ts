import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/integrations/mongodb/connection";
import ChatModel from "@/models/Chat";
import { getCurrentMember } from "@/lib/authenticaiton/verifications";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentMember(request);
    if (!user?._id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const chats = await ChatModel.find({ user: (user as any)._id })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ data: chats });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentMember(request);
    if (!user?._id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const title = typeof body?.title === "string" ? body.title.trim() : "";

    await connectDB();
    const chat = await ChatModel.create({ user: (user as any)._id, title });

    return NextResponse.json({ data: chat }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
  }
}