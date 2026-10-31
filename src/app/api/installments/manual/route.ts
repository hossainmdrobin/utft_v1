import { getCurrentMember } from "@/lib/authenticaiton/verifications";
import { Installment } from "@/models/Installment";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const currentUser = await getCurrentMember(req, ["admin", "president", "director"])
        const body = await req.json();
        const { member, data } = body;
        if (!member || !data) {
            return NextResponse.json({ message: "You must provide member and data" }, { status: 400 })
        }

        if (!Array.isArray(data) || data.length === 0) {
            return NextResponse.json({ message: "No installments to create" }, { status: 400 })
        }

        // Check for existing installments to avoid duplicate key errors
        const existingKeys = await Installment.find(
            {
                member,
                $or: data.map((item) => ({ month: item.month, year: item.year }))
            },
            { month: 1, year: 1 }
        ).lean();

        const existingSet = new Set(
            existingKeys.map((item) => `${item.month}-${item.year}`)
        );

        const toCreate = data.filter(
            (item) => !existingSet.has(`${item.month}-${item.year}`)
        );

        if (toCreate.length === 0) {
            return NextResponse.json(
                { message: "Installments for these months/years already exist for this member" },
                { status: 409 }
            );
        }

        const readyData = toCreate.map((item) => {
            return { ...item, created_by: currentUser._id, member }
        })

        const newInstallments = await Installment.insertMany(readyData, { ordered: false });
        return NextResponse.json({ newInstallments }, { status: 200 })
    } catch (e: any) {
        console.log(e)
        if (e.code === 11000) {
            return NextResponse.json({ message: "Installment already exists for this member and period" }, { status: 409 })
        }
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
    }
}