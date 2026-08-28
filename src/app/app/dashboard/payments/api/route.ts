import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/integrations/mongodb/connection";
import { Installment } from "@/models/Installment";

export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);

  const filter: Record<string, any> = {};

  const member = searchParams.get("member");
  if (member) filter.member = member;

  const method = searchParams.get("method");
  if (method) filter.method = method;

  const currency = searchParams.get("currency");
  if (currency) filter.currency = currency;

  const status = searchParams.get("status");
  if (status) filter.status = status;

  const month = searchParams.get("month");
  if (month) filter.month = Number(month);

  const year = searchParams.get("year");
  if (year) filter.year = Number(year);

  const day = searchParams.get("day");
  if (day) filter.day = Number(day);

  const amountMin = searchParams.get("amount_min");
  const amountMax = searchParams.get("amount_max");
  if (amountMin || amountMax) {
    filter.amount = {};
    if (amountMin) filter.amount.$gte = Number(amountMin);
    if (amountMax) filter.amount.$lte = Number(amountMax);
  }

  const createdFrom = searchParams.get("created_from");
  const createdTo = searchParams.get("created_to");
  if (createdFrom || createdTo) {
    filter.created_at = {};
    if (createdFrom) filter.created_at.$gte = new Date(createdFrom);
    if (createdTo) filter.created_at.$lte = new Date(createdTo);
  }

  const search = searchParams.get("search");
  if (search) {
    const regex = new RegExp(search, "i");
    filter.$or = [
      { transaction_id: regex },
      { cus_name: regex },
      { description: regex },
    ];
  }

  try {
    const installments = await Installment.find(filter)
      .sort({ created_at: -1 })
      .lean();
    return NextResponse.json({ data: installments, count: installments.length });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to fetch installments" },
      { status: 500 }
    );
  }
}
