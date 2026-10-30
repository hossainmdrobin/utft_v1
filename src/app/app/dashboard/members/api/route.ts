import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/integrations/mongodb/connection";
import { hashPassword } from "@/integrations/mongodb/lib/auth";
import { Member } from "@/models/member";
import { Setting } from "@/models/settingAndStates";
import { getCurrentMember } from "@/lib/authenticaiton/verifications";
import { AuditLog } from "@/integrations/mongodb/models/AuditLog";

interface MemberFilter {
  stage?: string;
  user_id?: string;
  role?: string;
  member_type?: string;
  $or?: { full_name?: RegExp; father_name?: RegExp; mother_name?: RegExp; nid?: RegExp; mobile?: RegExp; nominee_nid?: RegExp }[];
}

// GETTING FILTERED MEMBER
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
  try {
    let setting = await Setting.findOne({}).sort({ created_at: 1 }).lean();
    if (!setting) {
      setting = await Setting.create({});
    }
    const count = await Setting.countDocuments({});
    if (count > 1) {
      await Setting.deleteMany({ _id: { $ne: setting._id } });
    }
    const nextSerial = setting.next_member_serial;
    await Setting.findByIdAndUpdate(setting._id, { $inc: { next_member_serial: 1 } });

    const newMember = await Member.create({ ...body, createdBy: member._id, password: await hashPassword(body.password), serial: nextSerial });
    await AuditLog.create({
      table_name: "Member",
      record_id: newMember._id,
      action: "INSERT",
      description: `Member created by ${member.full_name || member.user_id} (${member.role}): ${newMember.user_id || newMember.full_name}`,
      changed_by: String(member._id),
      changed_at: new Date().toISOString(),
    });
    return NextResponse.json({ data: newMember }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to create member" },
      { status: 400 }
    );
  }
}

// 
export async function PATCH(req: NextRequest) {
  await connectDB();
  const user = await getCurrentMember(req);
  console.log(user, "the user")
  const body = await req.json();
  const { id, ...updateData } = body;
  if (!id) {
    return NextResponse.json({ error: "Member id is required" }, { status: 400 });
  }
  if (!(['admin', 'president', 'director'].includes(user.role) || String(user._id) === id)) return NextResponse.json(
    { error: "Failed to update member" },
    { status: 400 }
  );
  try {
    const oldMember = await Member.findById(id)
    const member = await (Member as any).findByIdAndUpdate(id, updateData, { new: true } as any).lean();
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    
    let description = `Member updated by ${user.full_name || user.user_id} (${user.role})`;
    if (updateData.stage === "approved" && oldMember?.stage !== "approved") {
      description = `Member APPROVED by ${user.full_name || user.user_id} (${user.role}): ${member.user_id || member.full_name}`;
    } else if (updateData.stage === "rejected" && oldMember?.stage !== "rejected") {
      description = `Member REJECTED by ${user.full_name || user.user_id} (${user.role}): ${member.user_id || member.full_name}`;
    } else if (updateData.stage) {
      description = `Member status changed to ${updateData.stage} by ${user.full_name || user.user_id} (${user.role}): ${member.user_id || member.full_name}`;
    }
    
    await AuditLog.create({
      table_name: "Member",
      record_id: member._id,
      action: "UPDATE",
      old_data: oldMember,
      new_data: member,
      changed_by: String(user._id),
      changed_at: new Date().toISOString(),
      description,
    });
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
    const member = await (Member as any).findById(id);
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    const oldData = member.toObject ? member.toObject() : member;
    await (Member as any).findByIdAndDelete(id);
    await AuditLog.create({
      table_name: "Member",
      record_id: member._id,
      action: "DELETE",
      old_data: oldData,
      description: `Member deleted: ${member.user_id ?? member._id}`,
      changed_at: new Date().toISOString(),
    });
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to delete member" },
      { status: 400 }
    );
  }
}
