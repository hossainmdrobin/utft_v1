import { getCurrentMember } from "@/lib/authenticaiton/verifications";
import { Installment } from "@/models/Installment";
import { AuditLog } from "@/integrations/mongodb/models/AuditLog";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const currentUser = await getCurrentMember(req, ["admin", "president", "director"])
        if(!currentUser || currentUser instanceof NextResponse){
            return NextResponse.json({message:"Unauthorized"}, {status:400});
        }
        const body = await req.json();
        const oldInstallment = await Installment.findById(id).lean();
        const updatedInstallment = await Installment.findByIdAndUpdate(id, {...body, updated_by:currentUser._id}, { new: true });
        try {
            await AuditLog.create({
                table_name: "Installment",
                record_id: String(id),
                action: "UPDATE",
                description: `Installment updated by ${currentUser.full_name || currentUser.user_id || currentUser.role}`,
                old_data: oldInstallment,
                new_data: updatedInstallment,
                changed_by: String(currentUser._id),
                changed_at: new Date().toISOString(),
            });
        } catch (e) {
            console.log("Audit log error:", e);
        }
        return NextResponse.json(updatedInstallment, { status: 200 })
    } catch (e: any) {
        if (e.code === 11000) {
            return NextResponse.json({ message: "Installment already exists for this member and period" }, { status: 409 })
        }
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
    }
}

