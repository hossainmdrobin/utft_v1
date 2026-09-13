import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

const testEmail = "hossainmdrobin9677@gmail.com";

function isAuthorized(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  return Boolean(cronSecret) && request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const smtpPassword = process.env.SMTP_PASSWORD;
  if (!smtpPassword) {
    return NextResponse.json({ error: "SMTP_PASSWORD is not configured" }, { status: 500 });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: "hossainmdrobin9677@gmail.com",
        pass: '15j@n1999',
      },
    });

    const result = await transporter.sendMail({
      from: "hossainmdrobin9677@gmail.com",
      to: "hossainmdrobin967@gmail.com",
      subject: "Vercel cron email test",
      text: `Vercel cron email test sent at ${new Date().toISOString()}.`,
    });

    return NextResponse.json({ sent: true, messageId: result.messageId });
  } catch (error) {
    console.error("Email test cron failed:", error);
    return NextResponse.json({ error: "Failed to send test email" }, { status: 500 });
  }
}