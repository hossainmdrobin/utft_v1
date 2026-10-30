import { getCurrentMember } from "@/lib/authenticaiton/verifications";
import { Installment } from "@/models/Installment";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const currentUser = await getCurrentMember(req, ["admin", "president", "director"])
        const body = await req.json();
        const { member, data } = body;
        if (!member && !data) {
            return NextResponse.json({ message: "You must provide id" })
        }
        const readyData = data.map((item) => {
            return { ...item, created_by: currentUser._id, member }
        })
        const newInstallments = await Installment.insertMany(readyData);
        return NextResponse.json({ newInstallments }, { status: 200 })
    } catch (e) {
        console.log(e)
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
    }
}