import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/integrations/mongodb/connection";
import { hashPassword } from "@/integrations/mongodb/lib/auth";
import { Member } from "@/models/member";
import { getCurrentMember } from "@/lib/authenticaiton/verifications";
import { Activity } from "@/models/activities";

interface MemberFilter {
  stage?: string;
  user_id?: string;
  role?: string;
  member_type?: string;
  joinDate?: { $gte?: Date; $lte?: Date };
  $or?: { full_name?: RegExp; father_name?: RegExp; mother_name?: RegExp; nid?: RegExp; mobile?: RegExp; nominee_nid?: RegExp }[];
}

export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const member = await Member.find().lean();
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    return NextResponse.json({ data: member });
  }

  const filter: MemberFilter = {};

  const stage = searchParams.get("stage");
  if (stage) filter.stage = stage;

  const userId = searchParams.get("user_id");
  if (userId) filter.user_id = userId;

  const role = searchParams.get("role");
  if (role) filter.role = role;

  const memberType = searchParams.get("member_type");
  if (memberType) filter.member_type = memberType;

  const joinDateFrom = searchParams.get("joinDateFrom");
  const joinDateTo = searchParams.get("joinDateTo");
  if (joinDateFrom || joinDateTo) {
    filter.joinDate = {};
    if (joinDateFrom) filter.joinDate.$gte = new Date(joinDateFrom);
    if (joinDateTo) filter.joinDate.$lte = new Date(joinDateTo);
  }

  const search = searchParams.get("search");
  if (search) {
    const regex = new RegExp(search, "i");
    filter.$or = [
      { full_name: regex },
      { father_name: regex },
      { mother_name: regex },
      { nid: regex },
      { mobile: regex },
      { nominee_nid: regex },
    ];
  }

  const members = await Member.find(filter as any).sort({ created_at: -1 }).lean();
  return NextResponse.json({ data: members, count: members.length });
}


// INITIATING A MEMBER
export async function POST(req: NextRequest) {
  await connectDB();
  const member = await getCurrentMember(req, ["admin", "president", "director"])
  if (!member) return NextResponse.json({ error: "Access Denied! Only Admin, President and Director can add members" })
  const body = await req.json();
console.log(body)
  try {
    const newMember = await Member.create({ ...body, createdBy: member._id, password: await hashPassword(body.password) });
    await Activity.create({ table_name: "Member", record_id: newMember._id, updatedBy: member._id, description: `A member is created with ID:${newMember.user_id}`, action: "create" })
    return NextResponse.json({ data: newMember }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to create member" },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  await connectDB();
  const user = await getCurrentMember(req);
  const body = await req.json();
  const { id, ...updateData } = body;

  if (!id) {
    return NextResponse.json({ error: "Member id is required" }, { status: 400 });
  }

  if (!['admin', 'president', 'director'].includes(user.role) || user._id != id) return NextResponse.json(
    { error: "Failed to update member" },
    { status: 400 }
  );
  try {
    const oldMember = await Member.findById(id)
    const member = await (Member as any).findByIdAndUpdate(id, updateData, { new: true } as any).lean();
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    await Activity.create({updatedBy:user._id, table_name:"Member",record_id:member._id,newData:member, oldData:oldMember,action:'update'})
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

  const body = await req.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: "Member id is required" }, { status: 400 });
  }

  try {
    // Await the query directly to avoid overload/union callable signature issues
    const member = await (Member as any).findByIdAndDelete(id);
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
