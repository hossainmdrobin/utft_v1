import { createMonthlyInstallments } from "@/lib/cron/createMonthlyInstallments";
import { NextRequest, NextResponse } from "next/server";

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
    const insData = await createMonthlyInstallments();
    if (insData) return NextResponse.json(insData, { status: 200 })
  } catch (error) {
    console.error("Daily email cron failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
