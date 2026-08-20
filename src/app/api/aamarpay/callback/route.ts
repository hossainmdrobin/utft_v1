import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function redirectToPayments(request: NextRequest, status: string, allParams?: Record<string, string>) {
  const url = new URL("/app/dashboard/payments", request.url);
  console.log("Getting all parasm",allParams); // Log all parameters for debugging
  url.searchParams.set("status", status);
  return NextResponse.redirect(url);
}

  
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  
  // Extract a single parameter
  const status = url.searchParams.get("status");
  
  // Get all search parameters as a plain key-value object
  const allParams = Object.fromEntries(url.searchParams.entries());
  console.log("All search parameters:", allParams); // Log all parameters for debugging

  return redirectToPayments(
    request, 
    status === "success" ? "success" : status === "cancel" ? "cancel" : "fail",
    allParams // Pass allParams to your handler if needed
  );
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const status = String(formData.get("pay_status") || formData.get("status") || "").toLowerCase();
  const isSuccessful = status === "success" || status === "successful" || status === "completed";
  return redirectToPayments(request, isSuccessful ? "success" : status === "cancel" ? "cancel" : "fail");
}
