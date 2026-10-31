import { getCurrentMember } from "@/lib/authenticaiton/verifications";
import { Installment } from "@/models/Installment";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const currentUser = await getCurrentMember(req, ["admin", "president", "director"])
        if(!currentUser){
            NextResponse.json({message:"Unauthorized"}, {status:400});
        }
        const body = await req.json();
        const updatedInstallment = await Installment.findByIdAndUpdate(id, {...body, updated_by:currentUser._id});
        return NextResponse.json(updatedInstallment, { status: 200 })
    } catch (e: any) {
        if (e.code === 11000) {
            return NextResponse.json({ message: "Installment already exists for this member and period" }, { status: 409 })
        }
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
    }
}

