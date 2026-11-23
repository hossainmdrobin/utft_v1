import { getCurrentMember } from "@/lib/authenticaiton/verifications";
import { connectDB } from "@/integrations/mongodb/connection";
import { Installment } from "@/models/Installment";
import { postInstallmentPayment } from "@/lib/accounting/installmentPost";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const currentUser = await getCurrentMember(req, ["admin", "president", "director"])
        if (!currentUser || currentUser instanceof NextResponse) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 400 });
        }

        await connectDB();
        const installment = await Installment.findById(id).lean();
        if (!installment) {
            return NextResponse.json({ message: "Installment not found" }, { status: 404 });
        }

        const result = await postInstallmentPayment({
            action: "update",
            installmentId: id,
            member: String(installment.member),
            amount: Number(installment.amount),
            date: installment.date || new Date().toISOString(),
            description: installment.description || `Installment marked as paid`,
            user: currentUser,
            paid_at: new Date().toISOString(),
            status: "paid",
            method: installment.method || "manual",
        });

        return NextResponse.json({
            data: {
                journalEntry: result.journalEntry,
                installment: result.installment,
                isDuplicate: result.isDuplicate,
            },
        }, { status: 200 });
    } catch (e: any) {
        if (e.code === 11000) {
            return NextResponse.json({ message: "Installment already exists for this member and period" }, { status: 409 })
        }
        return NextResponse.json({ message: e.message || "Internal Server Error" }, { status: 400 })
    }
}
