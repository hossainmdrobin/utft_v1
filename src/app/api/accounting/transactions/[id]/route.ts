import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/integrations/mongodb/connection";
import { JournalEntry } from "@/models/JournalEntry";
import { getCurrentMember } from "@/lib/authenticaiton/verifications";

const ADMIN_ROLES = ["admin", "president", "director"];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await getCurrentMember(req);
  const { id } = await params;

  if (!id || id === "undefined" || id === "null") {
    return NextResponse.json({ error: "Invalid journal entry ID" }, { status: 400 });
  }

  try {
    await connectDB();
    const JournalEntryModel = JournalEntry as any;
    const entry = await JournalEntryModel.findById(id)
      .populate("member", "user_id full_name")
      .populate("created_by", "user_id full_name")
      .populate("lines.account", "code name")
      .lean();

    if (!entry) {
      return NextResponse.json({ error: "Journal entry not found" }, { status: 404 });
    }

    return NextResponse.json({ data: entry });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to fetch journal entry" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentMember(req, ADMIN_ROLES);
  if (user instanceof NextResponse) return user;
  if (!user) {
    return NextResponse.json({ error: "Access Denied" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  if (!id || id === "undefined" || id === "null") {
    return NextResponse.json({ error: "Invalid journal entry ID" }, { status: 400 });
  }

  try {
    await connectDB();
    const JournalEntryModel = JournalEntry as any;
    const entry = await JournalEntryModel.findByIdAndUpdate(id, body, { new: true }).lean();
    if (!entry) {
      return NextResponse.json({ error: "Journal entry not found" }, { status: 404 });
    }
    return NextResponse.json({ data: entry });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to update journal entry" },
      { status: 400 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentMember(req, ADMIN_ROLES);
  if (user instanceof NextResponse) return user;
  if (!user) {
    return NextResponse.json({ error: "Access Denied" }, { status: 403 });
  }

  const { id } = await params;

  if (!id || id === "undefined" || id === "null") {
    return NextResponse.json({ error: "Invalid journal entry ID" }, { status: 400 });
  }

  try {
    await connectDB();
    const JournalEntryModel = JournalEntry as any;
    const entry = await JournalEntryModel.findByIdAndDelete(id);
    if (!entry) {
      return NextResponse.json({ error: "Journal entry not found" }, { status: 404 });
    }
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to delete journal entry" },
      { status: 400 },
    );
  }
}
