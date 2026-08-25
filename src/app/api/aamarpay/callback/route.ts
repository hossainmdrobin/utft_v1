import { Installment } from "@/models/Installment";
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
      const { month, year } = getCurrentDhakaDate();
      const parsedInstallments = JSON.parse(url.searchParams.get('installments') || "[]");
      const installments = Array.isArray(parsedInstallments)
        ? parsedInstallments.filter(
            (installment): installment is { month: number; year: number } =>
              Number.isInteger(installment?.month) &&
              installment.month >= 1 &&
              installment.month <= 12 &&
              Number.isInteger(installment?.year) &&
              installment.year >= 2000,
          )
        : [];
      const periods = Array.from(
        new Map(
          (installments.length > 0 ? installments : [{ month, year }]).map((installment) => [
            `${installment.year}-${installment.month}`,
            installment,
          ]),
        ).values(),
      );
      const installmentAmount = Number(amount) / periods.length;
      const status = installmentStatus === "regular" || installments.length === 0 ? "regular" : "advance";

      if (member) {
        await Promise.all(
          periods.map(({ month: installmentMonth, year: installmentYear }) =>
            Installment.findOneAndUpdate(
              { member, month: installmentMonth, year: installmentYear },
              {
                transaction_id,
                amount: installmentAmount,
                member,
                month: installmentMonth,
                year: installmentYear,
                status,
              },
              { upsert: true, new: true, setDefaultsOnInsert: true },
            ),
          ),
        );
      } else {
        await Installment.create(
          periods.map(({ month: installmentMonth, year: installmentYear }) => ({
            transaction_id,
            amount: installmentAmount,
            member,
            month: installmentMonth,
            year: installmentYear,
            status,
          })),
        );
      }
    }
    // return redirectToPayments(request, isSuccessful ? "success" : status === "cancel" ? "cancel" : "fail");
    return NextResponse.redirect("http://localhost:3000/app/dashboard/payments", 303);
  } catch (error) {
    console.error("Error processing AamarPay callback:", error);
    return NextResponse.redirect("http://localhost:3000/app/dashboard/payments", 303);
  }
}
