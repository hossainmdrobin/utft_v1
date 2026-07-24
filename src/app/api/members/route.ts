import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/integrations/mongodb/connection";
import { UserRole } from "@/integrations/mongodb/models/UserRole";
import { hashPassword, verifyToken } from "@/integrations/mongodb/lib/auth";
import { Member } from "@/models/member";

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
  const { user_id, password } = body;
  console.log(body)

  if (!user_id || !password) {
    return NextResponse.json({ error: "unique_code and password are required" }, { status: 400 });
  }

  try {
    const hashedPassword = await hashPassword(password);
    const member = await Member.create({
      user_id,
      password:hashedPassword
    });

    return NextResponse.json(
      {
        data: {
          member: { id: String(member._id), user_id: member.user_id },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.log(error)
    return NextResponse.json({ error: (error as Error)?.message || "Failed to create member" }, { status: 400 });
  }
}
