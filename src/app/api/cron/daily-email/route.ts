import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

const resend = new Resend(process.env.RESEND_API_KEY);

function isAuthorized(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  return Boolean(cronSecret) && request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

function formatDhakaDateTime() {
  const now = new Date();
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dhaka",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);
  return { date, time };
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.DAILY_EMAIL_TO;
  const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  if (!apiKey) {
    return NextResponse.json({ error: "RESEND_API_KEY is not configured" }, { status: 500 });
  }

  if (!to) {
    return NextResponse.json({ error: "DAILY_EMAIL_TO is not configured" }, { status: 500 });
  }

  const { date, time } = formatDhakaDateTime();

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject: "Daily Midnight Email",
      text: `Hello,\n\nThis is your scheduled daily email.\n\nYour cron job is working successfully.\n\nDate: ${date}\nTime: ${time}\n\nRegards,\nYour Next.js Cron Job`,
    });

    if (error) {
      console.error("Daily email cron failed (Resend):", error);
      return NextResponse.json({ error: "Failed to send daily email" }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        sent: true,
        messageId: data?.id,
        to,
        subject: "Daily Midnight Email",
        date,
        time,
      },
    });
  } catch (error) {
    console.error("Daily email cron failed:", error);
    return NextResponse.json({ error: "Failed to send daily email" }, { status: 500 });
  }
}
