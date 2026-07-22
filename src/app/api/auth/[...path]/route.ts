import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/integrations/mongodb/connection";
import { createUser, signInUser, verifyToken } from "@/integrations/mongodb/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  await connectDB();
  const body = await req.json();
  const { action, email, password, name } = body;

  if (action === "signup") {
    try {
      const result = await createUser({ email, password, name });
      return NextResponse.json({ data: result.user, session: { access_token: result.token, user: result.user } });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  if (action === "signin") {
    try {
      const result = await signInUser(email, password);
      return NextResponse.json({ data: result.user, session: { access_token: result.token, user: result.user } });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  const token = searchParams.get("token");
  const authHeader = req.headers.get("authorization");

  if (action === "session") {
    const accessToken = token || authHeader?.replace("Bearer ", "");
    if (!accessToken) {
      return NextResponse.json({ data: { session: null } });
    }
    
    const decoded = verifyToken(accessToken);
    if (!decoded) {
      return NextResponse.json({ data: { session: null } });
    }

    return NextResponse.json({
      data: {
        session: {
          access_token: accessToken,
          user: { id: decoded.userId },
        },
      },
    });
  }

  if (action === "user") {
    const accessToken = token || authHeader?.replace("Bearer ", "");
    if (!accessToken) {
      return NextResponse.json({ data: { user: null } });
    }

    const decoded = verifyToken(accessToken);
    if (!decoded) {
      return NextResponse.json({ data: { user: null } });
    }

    return NextResponse.json({
      data: {
        user: { id: decoded.userId },
      },
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
