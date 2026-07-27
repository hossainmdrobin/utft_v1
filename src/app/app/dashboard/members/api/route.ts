import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/integrations/mongodb/connection";
import { hashPassword } from "@/integrations/mongodb/lib/auth";
import { Member } from "@/models/member";

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
  // const { searchParams } = new URL(req.url);
  // const id = searchParams.get("id");

  // if (id) {
  //   const member = await Member.find().lean();
  //   if (!member) {
  //     return NextResponse.json({ error: "Member not found" }, { status: 404 });
  //   }
  //   return NextResponse.json({ data: member });
  // }

  // const filter: MemberFilter = {};

  // const stage = searchParams.get("stage");
  // if (stage) filter.stage = stage;

  // const userId = searchParams.get("user_id");
  // if (userId) filter.user_id = userId;

  // const role = searchParams.get("role");
  // if (role) filter.role = role;

  // const memberType = searchParams.get("member_type");
  // if (memberType) filter.member_type = memberType;

  // const joinDateFrom = searchParams.get("joinDateFrom");
  // const joinDateTo = searchParams.get("joinDateTo");
  // if (joinDateFrom || joinDateTo) {
  //   filter.joinDate = {};
  //   if (joinDateFrom) filter.joinDate.$gte = new Date(joinDateFrom);
  //   if (joinDateTo) filter.joinDate.$lte = new Date(joinDateTo);
  // }

  // const search = searchParams.get("search");
  // if (search) {
  //   const regex = new RegExp(search, "i");
  //   filter.$or = [
  //     { full_name: regex },
  //     { father_name: regex },
  //     { mother_name: regex },
  //     { nid: regex },
  //     { mobile: regex },
  //     { nominee_nid: regex },
  //   ];
  // }

  // const members = await Member.find(filter as any).sort({ created_at: -1 }).lean();
  const members = await Member.find();
  console.log(members)
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
    const member = await (Member as any).findByIdAndUpdate(id, updateData, { new: true } as any).lean();
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
