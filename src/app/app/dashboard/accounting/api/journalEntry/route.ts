import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/integrations/mongodb/connection";
import { JournalEntry } from "@/models/JournalEntry";
import { JournalEntryLine } from "@/models/JournalEntryLine";
import { getCurrentMember } from "@/lib/authenticaiton/verifications";
import { Activity } from "@/models/activities";

const ADMIN_ROLES = ["admin", "president", "director"];

function getSortOrder(order: string | null): 1 | -1 {
  return order === "asc" ? 1 : -1;
}

export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);

  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const sortOrder = getSortOrder(searchParams.get("order"));
  const memberId = searchParams.get("member_id");
  const status = searchParams.get("status");

  try {
    // Default: list journal entries
    const filter: Record<string, any> = {};

    if (dateFrom || dateTo) {
      filter.entry_date = {};
      if (dateFrom) filter.entry_date.$gte = dateFrom;
      if (dateTo) filter.entry_date.$lte = dateTo;
    }

    if (memberId) filter.member_id = memberId;
    if (status) filter.status = status;

    const entries = await JournalEntry.find(filter)
      .sort({ entry_date: sortOrder })
    return NextResponse.json({ data: entries, count: entries.length });
  } catch (error) {
    console.log("Error fetching journal entries:", error);
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to fetch journal entries" },
      { status: 500 }
    );
  }
}

// POST - Create a journal entry (with optional lines) or a single journal entry line
// Body:
//   type=line -> create a journal entry line (other fields are line fields)
//   otherwise -> create a journal entry; include `lines` array for child lines
export async function POST(req: NextRequest) {
  await connectDB();
  const user = await getCurrentMember(req, ADMIN_ROLES);
  if (!user) {
    return NextResponse.json(
      { error: "Access Denied! Only Admin, President and Director can create journal entries" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { type, lines, ...data } = body;

  try {
    const entry = await JournalEntry.create({ ...data, created_by: user._id });
    const entrylines = await JournalEntryLine.insertMany(
      (lines || []).map((line: any) => ({
        ...line,
        journal_entry_id: entry._id,
        created_by: user._id,
      }))
    );
    entry.lines = entrylines.map((line) => line._id);
    await entry.save();
    await Activity.create({
      table_name: "JournalEntry",
      record_id: entry._id,
      description: `Journal entry created: ${entry.entry_number}`,
      action: "create",
    });
    return NextResponse.json({ data: entry, lines: entrylines });

  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to create journal entry" },
      { status: 400 }
    );
  }
}

// PATCH - Update a journal entry or a journal entry line
// Body:
//   type=line -> update a journal entry line (id + line fields)
//   otherwise -> update a journal entry (id + entry fields)
export async function PATCH(req: NextRequest) {
  await connectDB();
  const user = await getCurrentMember(req, ADMIN_ROLES);
  if (!user) {
    return NextResponse.json(
      { error: "Access Denied! Only Admin, President and Director can update journal entries" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { id, type, ...updateData } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  try {
    if (type === "line") {
      const line = await JournalEntryLine.findByIdAndUpdate(id, updateData, { new: true }).lean();
      if (!line) {
        return NextResponse.json({ error: "Journal entry line not found" }, { status: 404 });
      }

      await Activity.create({
        table_name: "JournalEntryLine",
        record_id: line._id,
        description: `Journal entry line updated`,
        action: "update",
      });

      return NextResponse.json({ data: line });
    }

    // Default: update journal entry
    const entry = await JournalEntry.findByIdAndUpdate(id, updateData, { new: true }).lean();
    if (!entry) {
      return NextResponse.json({ error: "Journal entry not found" }, { status: 404 });
    }

    await Activity.create({
      table_name: "JournalEntry",
      record_id: entry._id,
      description: `Journal entry updated: ${entry.entry_number}`,
      action: "update",
    });

    return NextResponse.json({ data: entry });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to update journal entry" },
      { status: 400 }
    );
  }
}

// DELETE - Delete a journal entry (and its lines) or a single journal entry line
// Body:
//   type=line -> delete a journal entry line (id only)
//   otherwise -> delete a journal entry (id only); also removes child lines
export async function DELETE(req: NextRequest) {
  await connectDB();
  const user = await getCurrentMember(req, ADMIN_ROLES);
  if (!user) {
    return NextResponse.json(
      { error: "Access Denied! Only Admin, President and Director can delete journal entries" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { id, type } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  try {
    if (type === "line") {
      const line = await JournalEntryLine.findByIdAndDelete(id);
      if (!line) {
        return NextResponse.json({ error: "Journal entry line not found" }, { status: 404 });
      }

      await Activity.create({
        table_name: "JournalEntryLine",
        record_id: line._id,
        description: `Journal entry line deleted`,
        action: "delete",
      });

      return NextResponse.json({ data: { success: true } });
    }

    // Default: delete journal entry and its child lines
    const entry = await JournalEntry.findByIdAndDelete(id);
    if (!entry) {
      return NextResponse.json({ error: "Journal entry not found" }, { status: 404 });
    }

    await JournalEntryLine.deleteMany({ journal_entry_id: id });

    await Activity.create({
      table_name: "JournalEntry",
      record_id: entry._id,
      description: `Journal entry deleted: ${entry.entry_number}`,
      action: "delete",
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to delete journal entry" },
      { status: 400 }
    );
  }
}
