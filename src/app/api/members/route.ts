import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/integrations/mongodb/connection";
import { User } from "@/integrations/mongodb/models/User";
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

export async function POST(req: NextRequest) {
  await connectDB();

  // const adminId = await getAdminUser(req);
  // if (!adminId) {
  //   return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
  // }

  const body = await req.json();
  const { unique_code, password } = body;
  console.log(body)

  if (!unique_code || !password) {
    return NextResponse.json({ error: "unique_code and password are required" }, { status: 400 });
  }

  try {
    const hashedPassword = await hashPassword(password);
    const user = await User.create({ email: unique_code, password: hashedPassword, name: unique_code });
    const member = await Member.create({
      unique_code,
      user_id: String(user._id),
      full_name: unique_code,
      member_type:"founding",
      status: "pending",
    });
    await UserRole.create({ user_id: String(user._id), role: "user" });

    return NextResponse.json(
      {
        data: {
          user: { id: String(user._id), email: user.email },
          member: { id: String(member._id), unique_code: member.unique_code },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ error: (error as Error)?.message || "Failed to create member" }, { status: 400 });
  }
}
