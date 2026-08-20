import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function redirectToPayments(request: NextRequest, status: string, allParams?: Record<string, string>) {
  const url = new URL("/app/dashboard/payments", request.url);
  url.searchParams.set("status", status);
  return NextResponse.redirect(url);
}


export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  // Extract a single parameter
  const status = url.searchParams.get("status");
  const transaction_id = url.searchParams.get("transactionId");

  // Get all search parameters as a plain key-value object
  const allParams = Object.fromEntries(url.searchParams.entries());
  console.log("Get method console:", { status, transaction_id });
  return redirectToPayments(
    request,
    status === "success" ? "success" : status === "cancel" ? "cancel" : "fail",
    allParams // Pass allParams to your handler if needed
  );
}

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    // Extract a single parameter
    const transaction_id = url.searchParams.get("transactionId");
    const formData = await request.formData();
    const status = String(formData.get("pay_status") || formData.get("status") || "").toLowerCase();
    // console.log("AamarPay callback received with status:", { status, transaction_id });
    const isSuccessful = status === "success" || status === "successful" || status === "completed";
    // return redirectToPayments(request, isSuccessful ? "success" : status === "cancel" ? "cancel" : "fail");
    return NextResponse.redirect("https://utft-v1.vercel.app",300);
  } catch (error) {
    console.error("Error processing AamarPay callback:", error);
        return NextResponse.redirect("https://utft-v1.vercel.app",300);
  }

}
