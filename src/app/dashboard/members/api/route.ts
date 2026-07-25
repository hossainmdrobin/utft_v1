import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/integrations/mongodb/connection";
import { Member } from "@/integrations/mongodb/models/Member";
import { UserRole } from "@/integrations/mongodb/models/UserRole";
import { hashPassword, verifyToken } from "@/integrations/mongodb/lib/auth";

export const dynamic = "force-dynamic";

async function getAdminUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  if (!decoded) return null;

  const adminRole = await UserRole.findOne({ user_id: decoded.userId, role: "admin" });
  return adminRole ? decoded.userId : null;
}

export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const member = await Member.findById(id).lean();
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    return NextResponse.json({ data: member });
  }

  const members = await Member.find({}).sort({ created_at: -1 }).lean();
  return NextResponse.json({ data: members, count: members.length });
}

export async function POST(req: NextRequest) {
  await connectDB();

//   const adminId = await getAdminUser(req);
//   if (!adminId) {
//     return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
//   }


  const body = await req.json();
  try {
    const member = await Member.create({...body,password:hashPassword(body.password)});
    return NextResponse.json({ data: member }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to create member" },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  await connectDB();

  const body = await req.json();
  const { id, ...updateData } = body;

  if (!id) {
    return NextResponse.json({ error: "Member id is required" }, { status: 400 });
  }

  try {
    const member = await Member.findByIdAndUpdate(id, updateData, { new: true }).lean();
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    return NextResponse.json({ data: member });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to update member" },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  await connectDB();

  const adminId = await getAdminUser(req);
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
  }

  const body = await req.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: "Member id is required" }, { status: 400 });
  }

  try {
    const member = await Member.findByIdAndDelete(id).lean();
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to delete member" },
      { status: 400 }
    );
  }
}
