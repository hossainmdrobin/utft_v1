import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/integrations/mongodb/connection";
import { JournalEntry } from "@/models/JournalEntry";
import "@/models/JournalEntryLine";
import { Account } from "@/models/Account";
import { getCurrentMember } from "@/lib/authenticaiton/verifications";
import { Activity } from "@/models/activities";

const ADMIN_ROLES = ["admin", "president", "director"];

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    await connectDB();
    const { id } = await params;

    try {
        const entry = await JournalEntry.findById(id)
            .lean()
            .populate("created_by")
            .populate({
                path: "lines",
                populate: {
                    path: "account_id",
                    select: "code name"
                }
            })

        if (!entry) {
            return NextResponse.json({ error: "Journal entry not found" }, { status: 404 });
        }

        const lines = entry.lines as any[];
        if (lines?.length) {
            const accountIds = lines.map((l) => l.account_id).filter(Boolean);
            const accounts = await Account.find({ _id: { $in: accountIds } }).lean();
            const accountMap = new Map(accounts.map((a: any) => [a._id.toString(), a]));

            const enrichedLines = lines.map((line) => ({
                ...line,
                account: line.account_id ? accountMap.get(line.account_id) || null : null,
            }));

            (entry as any).lines = enrichedLines;
        }

        return NextResponse.json({ data: entry });
    } catch (error) {
        console.log(error);
        return NextResponse.json(
            { error: (error as Error)?.message || "Failed to fetch journal entry" },
            { status: 500 }
        );
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    await connectDB();
    const user = await getCurrentMember(req, ADMIN_ROLES);
    if (!user) {
        return NextResponse.json(
            { error: "Access Denied! Only Admin, President and Director can update journal entries" },
            { status: 403 }
        );
    }

    const { id } = await params;
    const body = await req.json();

    try {
        const entry = await JournalEntry.findByIdAndUpdate(id, body, { new: true }).lean();
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
