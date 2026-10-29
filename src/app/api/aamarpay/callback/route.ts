import { Installment } from "@/models/Installment";
import type { InstallmentDoc } from "@/models/Installment";
import { GatewayTransaction } from "@/models/GatewayTransaction";
import { Member } from "@/models/member";
import { AuditLog } from "@/integrations/mongodb/models/AuditLog";
import { getCurrentDhakaDate } from "@/lib/date/dhaka";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";



export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    // Extract a single parameter
    const formData = await request.formData();
    const status = String(formData.get("pay_status") || formData.get("status") || "").toLowerCase();
    // console.log("AamarPay callback received with status:", { status, transaction_id });
    const isSuccessful = status === "success" || status === "successful" || status === "completed";
    if (isSuccessful) {
      const transaction_id = url.searchParams.get("transactionId");
      const amount = url.searchParams.get('amount')
      const member = url.searchParams.get('user_id')
      const installmentStatus = url.searchParams.get('installmentStatus')
      const description = url.searchParams.get('description')
      const { month, year } = getCurrentDhakaDate();
      const parsedInstallments = JSON.parse(url.searchParams.get('installments') || "[]");
      const installments = Array.isArray(parsedInstallments)
        ? parsedInstallments.filter(
            (installment): installment is { month: number; year: number; day?: number } =>
              Number.isInteger(installment?.month) &&
              installment.month >= 1 &&
              installment.month <= 12 &&
              Number.isInteger(installment?.year) &&
              installment.year >= 2000,
          )
        : [];
      const periods = Array.from(
        new Map(
          (installments.length > 0 ? installments : [{ month, year, day: undefined }]).map((installment) => [
            `${installment.year}-${installment.month}-${installment.day ?? "default"}`,
            installment,
          ]),
        ).values(),
      );
      const normalizedStatus = installmentStatus === "due" || installmentStatus === "regular" || installmentStatus === "advance"
        ? installmentStatus
        : (installments.length === 0 ? "regular" : "advance");
      const installmentAmount = Number(amount) / Math.max(periods.length, 1);

      const memberDoc = member ? await Member.findOne({ user_id: member }).lean() : null;
      const changedBy = memberDoc?._id ? String(memberDoc._id) : undefined;
      const changedByName = memberDoc?.full_name || member || "system";

      let savedInstallments: InstallmentDoc[] = [];
      if (member) {
        savedInstallments = (await Promise.all(
          periods.map(async ({ month: installmentMonth, year: installmentYear, day: installmentDay }) => {
            const query = {
              member,
              month: installmentMonth,
              year: installmentYear,
              ...(installmentDay !== undefined ? { day: installmentDay } : {}),
            };

            const update = {
              $set: {
                transaction_id,
                amount: installmentAmount,
                member,
                month: installmentMonth,
                year: installmentYear,
                day: installmentDay ?? undefined,
                status: normalizedStatus,
                date: new Date().toISOString(),
                method: "aamarpay",
                description: description || "Installment payment",
              },
            };

            return Installment.findOneAndUpdate(query, update, {
              upsert: true,
              new: true,
              setDefaultsOnInsert: true,
            });
          }),
        )) as InstallmentDoc[];
      } else {
        savedInstallments = await Installment.create(
          periods.map(({ month: installmentMonth, year: installmentYear, day: installmentDay }) => ({
            transaction_id,
            amount: installmentAmount,
            member,
            month: installmentMonth,
            year: installmentYear,
            day: installmentDay ?? undefined,
            status: normalizedStatus,
            date: new Date().toISOString(),
            method: "aamarpay",
            description: description || "Installment payment",
          })),
        );
      }

      try {
        await Promise.all(
          savedInstallments.map((installment) =>
            AuditLog.create({
              table_name: "Installment",
              record_id: String(installment._id),
              action: "UPDATE",
              action_type: "installment_payment",
              description: `Installment paid for member ${changedByName} via aamarpay: ${transaction_id}`,
              changed_by: changedBy,
              changed_at: new Date().toISOString(),
              new_data: {
                transaction_id,
                amount: installmentAmount,
                month: installment.month,
                year: installment.year,
                status: normalizedStatus,
              },
            }),
          ),
        );
      } catch (e) {
        console.log("Audit log error:", e);
      }

      if (transaction_id && member) {
        await GatewayTransaction.create({
          transaction_id,
          member,
          amount: Number(amount),
          description: description || "",
          status: "success",
        });
      }

      try {
        const { postPayment } = await import("@/lib/accounting/autoPost");
        const memberDoc = await Member.findOne({ user_id: member }).lean();
        await Promise.all(
          savedInstallments.map(async (installment) => {
            await postPayment({
              sourceType: "installment",
              sourceId: String(installment._id),
              paymentReference: transaction_id,
              memberId: String(memberDoc?._id || member),
              paymentDate: installment.date || new Date().toISOString(),
              amount: installmentAmount,
              description: installment.description || "Installment payment",
              user: {
                _id: String(memberDoc?._id),
                full_name: memberDoc?.full_name || member,
                role: memberDoc?.role,
              },
            });
          }),
        );
      } catch (e) {
        console.error("Auto-post journal entry error (non-blocking):", e);
      }
    }
    // return redirectToPayments(request, isSuccessful ? "success" : status === "cancel" ? "cancel" : "fail");
    return NextResponse.redirect("http://localhost:3000/app/dashboard/payments", 303);
  } catch (error) {
    console.error("Error processing AamarPay callback:", error);
    return NextResponse.redirect("http://localhost:3000/app/dashboard/payments", 303);
  }
}
