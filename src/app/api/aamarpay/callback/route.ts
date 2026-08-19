import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function redirectToPayments(request: NextRequest, status: string) {
  const url = new URL("/app/dashboard/payments", request.url);
  url.searchParams.set("status", status);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const status = new URL(request.url).searchParams.get("status");
  return redirectToPayments(request, status === "success" ? "success" : status === "cancel" ? "cancel" : "fail");
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const status = String(formData.get("pay_status") || formData.get("status") || "").toLowerCase();
  const isSuccessful = status === "success" || status === "successful" || status === "completed";
  return redirectToPayments(request, isSuccessful ? "success" : status === "cancel" ? "cancel" : "fail");
}
