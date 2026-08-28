import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/integrations/mongodb/connection";
import { createMonthlyInstallments } from "@/lib/cron/createMonthlyInstallments";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  return Boolean(cronSecret) && request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const result = await createMonthlyInstallments();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Monthly installment cron failed:", error);
    return NextResponse.json({ error: "Failed to create monthly installments" }, { status: 500 });
  }
}