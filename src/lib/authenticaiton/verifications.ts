import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/integrations/mongodb/connection";
import { Member } from "@/models/member";
import { verifyToken } from "@/integrations/mongodb/lib/auth";

export async function getCurrentMember(req: NextRequest, roles?: string[]) {
  await connectDB();

  const token = req.cookies.get("token")?.value;
  if (!token) {
    const response = NextResponse.redirect(new URL("/auth", req.url));
    response.cookies.delete("token");
    return response;
  }

  const decoded = verifyToken(token);
  if (!decoded?.userId) {
    const response = NextResponse.redirect(new URL("/auth", req.url));
    response.cookies.delete("token");
    return response;
  }

  const member = await (Member as any)
    .findOne({ user_id: decoded.userId })
    .select("-password")
    .lean();

  if (!member) {
    const response = NextResponse.redirect(new URL("/auth", req.url));
    response.cookies.delete("token");
    return response;
  }

  if (roles && roles.length > 0 && !roles.includes(member.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return member;
}
