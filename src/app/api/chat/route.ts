import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/integrations/mongodb/connection";
import ChatModel from "@/models/Chat";
import { getCurrentMember } from "@/lib/authenticaiton/verifications";
import MessageModel from "@/models/Message";
import { AuditLog } from "@/integrations/mongodb/models/AuditLog";

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
    if (!body?.prompt) return NextResponse.json({ message: "Prompt is required" }, { status: 400 })
    console.log(body)
    const title = body.prompt.split(/\s+/).slice(0, 5).join(" ");

    await connectDB();
    const chat = await ChatModel.create({
      user: (user as any)._id,
      title,
      model: body.model || process.env.DEFAULT_AI_MODEL || "gh/gpt-5.4-nano",
    });
    await MessageModel.create({ message: body.prompt, chat: chat?._id, role: 'user' })

    try {
      await Promise.all([
        AuditLog.create({
          table_name: "Chat",
          record_id: String(chat?._id),
          action: "INSERT",
          description: `Conversation created by ${(user as any).full_name || (user as any).user_id || (user as any).role}`,
          new_data: chat,
          changed_by: String((user as any)._id),
          changed_at: new Date().toISOString(),
        }),
        AuditLog.create({
          table_name: "Message",
          record_id: String(chat?._id),
          action: "INSERT",
          description: `User message sent in conversation ${String(chat?._id)}`,
          new_data: { message: body.prompt, role: "user", chat: chat?._id },
          changed_by: String((user as any)._id),
          changed_at: new Date().toISOString(),
        }),
      ]);
    } catch (e) {
      console.log("Audit log error:", e);
    }


    return NextResponse.json({ data: chat }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
  }
}