import { connectDB } from "@/integrations/mongodb/connection";
import { GatewayTransaction } from "@/models/GatewayTransaction";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type GatewayTransactionFilter = {
  member?: string;
  method?: string;
  currency?: string;
  status?: string;
  transaction_id?: string;
  $or?: Array<{ transaction_id?: RegExp; description?: RegExp }>;
  amount?: { $gte?: number; $lte?: number };
  created_at?: { $gte?: Date; $lte?: Date };
};

function parseNumber(value: string | null, name: string) {
  if (value === null || value.trim() === "") return undefined;

  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`${name} must be a valid number.`);
  }

  return number;
}

function parseDate(value: string | null, name: string) {
  if (!value) return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${name} must be a valid date.`);
  }

  return date;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const filter: GatewayTransactionFilter = {};
    const member = searchParams.get("member");
    const method = searchParams.get("method");
    const currency = searchParams.get("currency");
    const status = searchParams.get("status");
    const transactionId = searchParams.get("transaction_id");
    const search = searchParams.get("search");
    const amountMin = parseNumber(searchParams.get("amount_min"), "amount_min");
    const amountMax = parseNumber(searchParams.get("amount_max"), "amount_max");
    const createdFrom = parseDate(searchParams.get("created_from"), "created_from");
    const createdTo = parseDate(searchParams.get("created_to"), "created_to");
    const page = parseNumber(searchParams.get("page"), "page") ?? 1;
    const limit = parseNumber(searchParams.get("limit"), "limit") ?? 50;

    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: "page must be a positive integer and limit must be between 1 and 100." },
        { status: 400 },
      );
    }
    if (amountMin !== undefined && amountMax !== undefined && amountMin > amountMax) {
      return NextResponse.json({ error: "amount_min cannot exceed amount_max." }, { status: 400 });
    }
    if (createdFrom && createdTo && createdFrom > createdTo) {
      return NextResponse.json({ error: "created_from cannot be after created_to." }, { status: 400 });
    }

    if (member) filter.member = member;
    if (method) filter.method = method;
    if (currency) filter.currency = currency;
    if (status) filter.status = status;
    if (transactionId) filter.transaction_id = transactionId;

    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ transaction_id: regex }, { description: regex }];
    }

    if (amountMin !== undefined || amountMax !== undefined) {
      filter.amount = {};
      if (amountMin !== undefined) filter.amount.$gte = amountMin;
      if (amountMax !== undefined) filter.amount.$lte = amountMax;
    }

    if (createdFrom || createdTo) {
      filter.created_at = {};
      if (createdFrom) filter.created_at.$gte = createdFrom;
      if (createdTo) filter.created_at.$lte = createdTo;
    }

    const skip = (page - 1) * limit;
    const [transactions, total] = await Promise.all([
      GatewayTransaction.find(filter).sort({ created_at: -1 }).skip(skip).limit(limit).lean().exec(),
      GatewayTransaction.countDocuments(filter).exec(),
    ]);

    return NextResponse.json({
      data: transactions,
      count: transactions.length,
      total,
      page,
      limit,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch gateway transactions." },
      { status: 500 },
    );
  }
}
