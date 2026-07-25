import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/integrations/mongodb/connection";
import { Member } from "@/models/member";
import { verifyPassword, generateToken, verifyToken } from "@/integrations/mongodb/lib/auth";
import { getCurrentMember } from "@/lib/authenticaiton/verifications";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const member =await getCurrentMember(req);
    if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 500 })
    return NextResponse.json({ data: { member } });
  } catch (error) {
    return NextResponse.json({ error: (error as Error)?.message || "Failed to fetch user" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json()
    const { user_id, password } = body;
    if (!user_id || !password) return NextResponse.json({ error: "Required data is not provided" }, { status: 400 })
    const member = await (Member as any).findOne({ user_id })
    console.log(member)
    if (!member) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    const valid = await verifyPassword(password, member.password);
    if (!valid) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    return NextResponse.json({
      data: {
        user: {
          id: member.user_id,
          email: member.email,
          role: member.role,
          full_name: member.full_name,
        },
      },
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error)?.message || "Login failed" }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json()
    const { user_id, data } = body;
    delete data.password;
    delete data.user_id;
    const member = await (Member as any).findOneAndUpdate({ user_id }, data, { new: true })
    if (!member) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    let response = NextResponse.json({ data })
    const token = generateToken(member.user_id);
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return response;

  } catch (error) {
    return NextResponse.json({ error: (error as Error)?.message || "Login failed" }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  await connectDB();

  const body = await req.json();
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  try {
    const normalizedEmail = String(email).trim().toLowerCase();
    const member = await (Member as any).findOne({ email: normalizedEmail });
    if (!member) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await verifyPassword(password, member.password);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = generateToken(member.user_id);

    const response = NextResponse.json({
      data: {
        user: {
          id: member.user_id,
          email: member.email,
          role: member.role,
          full_name: member.full_name,
        },
      },
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: (error as Error)?.message || "Login failed" }, { status: 400 });
  }
}
