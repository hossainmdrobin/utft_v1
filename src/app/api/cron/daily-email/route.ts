import { createMonthlyInstallments } from "@/lib/cron/createMonthlyInstallments";
import { connectDB } from "@/integrations/mongodb/connection";
import { NextRequest, NextResponse } from "next/server";
import { AuditLog } from "@/integrations/mongodb/models/AuditLog";

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
    const insData = await createMonthlyInstallments();
    try {
      await AuditLog.create({
        table_name: "System",
        record_id: "cron-monthly-installments",
        action: "CRON_EXECUTION",
        description: insData?.ran
          ? `Monthly installment cron succeeded: ${insData.created} created for ${insData.month}/${insData.year}`
          : `Monthly installment cron skipped: ${(insData as { reason?: string })?.reason ?? "unknown"}`,
        new_data: insData,
        changed_at: new Date().toISOString(),
      });
    } catch (e) {
      console.log("Audit log error:", e);
    }
    if (insData) return NextResponse.json(insData, { status: 200 })
  } catch (error) {
    console.error("Daily email cron failed:", error);
    try {
      await AuditLog.create({
        table_name: "System",
        record_id: "cron-monthly-installments",
        action: "CRON_EXECUTION",
        description: `Monthly installment cron failed: ${error instanceof Error ? error.message : String(error)}`,
        changed_at: new Date().toISOString(),
      });
    } catch (e) {
      console.log("Audit log error:", e);
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
