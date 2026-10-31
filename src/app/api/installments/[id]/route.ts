import { getCurrentMember } from "@/lib/authenticaiton/verifications";
import { Installment } from "@/models/Installment";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await getCurrentMember(req, ["admin", "president", "director"]);
        const { id } = await params;
        const installments = await Installment.find({ member: id })
            .populate("member", "profile_photo full_name")
            .populate("created_by", "profile_photo full_name")
            .sort({ created_at: -1 })

        return NextResponse.json(installments, { status: 200 });
    } catch (e) {
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
    }
}