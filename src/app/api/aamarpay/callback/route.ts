import { OnlineTransaction } from "@/models/OnlineTransaction";
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

      await OnlineTransaction.create({ transaction_id, amount, member })
    }
    // return redirectToPayments(request, isSuccessful ? "success" : status === "cancel" ? "cancel" : "fail");
    return NextResponse.redirect("https://utft-v1.vercel.app", 303);
  } catch (error) {
    console.error("Error processing AamarPay callback:", error);
    return NextResponse.redirect("https://utft-v1.vercel.app", 303);
  }
}
