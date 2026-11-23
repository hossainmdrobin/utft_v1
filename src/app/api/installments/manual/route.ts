import { getCurrentMember } from "@/lib/authenticaiton/verifications";
import { connectDB } from "@/integrations/mongodb/connection";
import { Installment } from "@/models/Installment";
import { postInstallmentPayment } from "@/lib/accounting/installmentPost";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        const currentUser = await getCurrentMember(req, ["admin", "president", "director"])
        if (currentUser instanceof NextResponse) return currentUser;
        const body = await req.json();
        const { member, data } = body;
        if (!member || !data) {
            return NextResponse.json({ message: "You must provide member and data" }, { status: 400 })
        }

        if (!Array.isArray(data) || data.length === 0) {
            return NextResponse.json({ message: "No installments to create" }, { status: 400 })
        }

        await connectDB();

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

        const results: any[] = [];
        for (const item of toCreate) {
            const doc = { ...item, created_by: currentUser._id, member };

            if (String(item.payment_status) === "paid") {
                const posted = await postInstallmentPayment({
                    action: "create",
                    member,
                    amount: Number(item.amount),
                    date: item.date || new Date().toISOString(),
                    description: item.description || `Advance installment for ${item.month}/${item.year}`,
                    user: currentUser,
                    month: item.month,
                    year: item.year,
                    day: item.day,
                    status: item.status,
                    method: item.method,
                    paid_at: item.paid_at,
                    transaction_id: item.transaction_id,
                    currency: item.currency,
                    account: item.account,
                });
                results.push({
                    ...doc,
                    _id: posted.installment?._id,
                    payment_status: "paid",
                    journalEntry: posted.journalEntry,
                    isDuplicate: posted.isDuplicate,
                });
            } else {
                const created = await Installment.create(doc);
                results.push(created);
            }
        }

        return NextResponse.json({ data: results }, { status: 200 })
    } catch (e: any) {
        console.log(e)
        if (e.code === 11000) {
            return NextResponse.json({ message: "Installment already exists for this member and period" }, { status: 409 })
        }
        return NextResponse.json({ message: e.message || "Internal Server Error" }, { status: 500 })
    }
}
