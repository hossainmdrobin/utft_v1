import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/integrations/mongodb/connection";
import { models } from "@/integrations/mongodb/models";
import { getCurrentMember } from "@/lib/authenticaiton/verifications";
import { AuditLog } from "@/integrations/mongodb/models/AuditLog";

export const dynamic = "force-dynamic";

function buildMongoQuery(params: URLSearchParams) {
  const filters: Record<string, any> = {};
  const sorts: { field: string; direction: 1 | -1 }[] = [];
  let limit: number | undefined;
  let single = false;
  let maybeSingle = false;
  let countOnly = false;
  let headOnly = false;

  for (const [key, value] of params.entries()) {
    if (key === "model") continue;

    if (key === "order") {
      const direction = value.startsWith("-") ? -1 : 1;
      const field = value.replace(/^-/, "");
      sorts.push({ field, direction });
      continue;
    }

    if (key === "limit") {
      limit = parseInt(value, 10);
      continue;
    }

    if (key === "single") {
      single = true;
      continue;
    }

    if (key === "maybeSingle") {
      maybeSingle = true;
      continue;
    }

    if (key === "head") {
      headOnly = true;
      continue;
    }

    if (key === "count") {
      continue;
    }

    if (key === "or") {
      filters.$or = value.split(",").map((part) => {
        const [field, op, val] = part.split(".");
        if (op === "eq") return { [field]: val };
        if (op === "neq") return { [field]: { $ne: val } };
        if (op === "gt") return { [field]: { $gt: val } };
        if (op === "gte") return { [field]: { $gte: val } };
        if (op === "lt") return { [field]: { $lt: val } };
        if (op === "lte") return { [field]: { $lte: val } };
        if (op === "in") return { [field]: { $in: val.split("|") } };
        return { [field]: val };
      });
      continue;
    }

    if (value.includes(".")) {
      const [field, op, val] = value.split(".");
      if (op === "eq") filters[field] = val;
      else if (op === "neq") filters[field] = { $ne: val };
      else if (op === "gt") filters[field] = { $gt: val };
      else if (op === "gte") filters[field] = { $gte: val };
      else if (op === "lt") filters[field] = { $lt: val };
      else if (op === "lte") filters[field] = { $lte: val };
      else if (op === "in") filters[field] = { $in: val.split("|") };
    } else if (value.includes(",")) {
      filters[key] = { $in: value.split(",") };
    } else {
      filters[key] = value;
    }
  }

  return { filters, sorts, limit, single, maybeSingle, countOnly, headOnly };
}

export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const modelName = searchParams.get("model");

  if (!modelName) {
    return NextResponse.json({ error: "Model name required" }, { status: 400 });
  }

  const Model = (models as any)[modelName];
  if (!Model) {
    return NextResponse.json({ error: `Model ${modelName} not found` }, { status: 404 });
  }

  const { filters, sorts, limit, single, maybeSingle, countOnly, headOnly } = buildMongoQuery(searchParams);

  if (headOnly) {
    const count = await Model.countDocuments(filters);
    return NextResponse.json({ data: null, count });
  }

  if (single || maybeSingle) {
    const doc = await Model.findOne(filters).sort(sorts.length ? sorts : undefined).lean();
    if (!doc && maybeSingle) {
      return NextResponse.json({ data: null });
    }
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ data: doc });
  }

  if (countOnly) {
    const count = await Model.countDocuments(filters);
    return NextResponse.json({ data: null, count });
  }

  let query = Model.find(filters);
  if (sorts.length) {
    query = query.sort(sorts as any);
  }
  if (limit) {
    query = query.limit(limit);
  }

  const docs = await query.lean();
  return NextResponse.json({ data: docs, count: docs.length });
}

export async function POST(req: NextRequest) {
  await connectDB();
  const body = await req.json();
  const { model, data, upsert } = body;

  if (!model) {
    return NextResponse.json({ error: "Model name required" }, { status: 400 });
  }

  const Model = (models as any)[model];
  if (!Model) {
    return NextResponse.json({ error: `Model ${model} not found` }, { status: 404 });
  }

  if (upsert && data._id) {
    const doc = await Model.findByIdAndUpdate(data._id, data, { new: true, upsert: true }).lean();
    return NextResponse.json({ data: doc }, { status: 201 });
  }

  const doc = await Model.create(data);
  try {
    const member = await getCurrentMember(req);
    const user = member instanceof NextResponse ? undefined : member;
    await AuditLog.create({
      table_name: model,
      record_id: String(doc._id),
      action: "INSERT",
      new_data: doc,
      changed_by: user ? String(user._id) : undefined,
      changed_at: new Date().toISOString(),
    });
  } catch (e) {
    console.log("Audit log error:", e);
  }
  return NextResponse.json({ data: doc }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  await connectDB();
  const body = await req.json();
  const { model, filter, data } = body;

  if (!model || !filter) {
    return NextResponse.json({ error: "Model name and filter required" }, { status: 400 });
  }

  const Model = (models as any)[model];
  if (!Model) {
    return NextResponse.json({ error: `Model ${model} not found` }, { status: 404 });
  }

  const oldDoc = await Model.findOne(filter).lean();
  const doc = await Model.findOneAndUpdate(filter, data, { new: true }).lean();
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const member = await getCurrentMember(req);
    const user = member instanceof NextResponse ? undefined : member;
    await AuditLog.create({
      table_name: model,
      record_id: String(doc._id),
      action: "UPDATE",
      old_data: oldDoc,
      new_data: doc,
      changed_by: user ? String(user._id) : undefined,
      changed_at: new Date().toISOString(),
    });
  } catch (e) {
    console.log("Audit log error:", e);
  }
  return NextResponse.json({ data: doc });
}

export async function DELETE(req: NextRequest) {
  await connectDB();
  const body = await req.json();
  const { model, filter } = body;

  if (!model || !filter) {
    return NextResponse.json({ error: "Model name and filter required" }, { status: 400 });
  }

  const Model = (models as any)[model];
  if (!Model) {
    return NextResponse.json({ error: `Model ${model} not found` }, { status: 404 });
  }

  const oldDoc = await Model.findOne(filter).lean();
  await Model.findOneAndDelete(filter);
  try {
    const member = await getCurrentMember(req);
    const user = member instanceof NextResponse ? undefined : member;
    await AuditLog.create({
      table_name: model,
      record_id: oldDoc ? String(oldDoc._id) : JSON.stringify(filter),
      action: "DELETE",
      old_data: oldDoc,
      changed_by: user ? String(user._id) : undefined,
      changed_at: new Date().toISOString(),
    });
  } catch (e) {
    console.log("Audit log error:", e);
  }
  return NextResponse.json({ success: true });
}
