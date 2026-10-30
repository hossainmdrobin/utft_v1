import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/integrations/mongodb/connection";
import { hashPassword, verifyPassword } from "@/integrations/mongodb/lib/auth";
import { Member } from "@/models/member";
import { getCurrentMember } from "@/lib/authenticaiton/verifications";
import { AuditLog } from "@/integrations/mongodb/models/AuditLog";

export const dynamic = "force-dynamic";

// CHANGE PASSWORD
export async function PATCH(req: NextRequest) {
  await connectDB();
  
  const body = await req.json();
  const { user_id, old_password, new_password } = body;
  
  if (!user_id || !old_password || !new_password) {
    return NextResponse.json({ error: "User ID, old password and new password are required" }, { status: 400 });
  }
  
  if (new_password.length < 6) {
    return NextResponse.json({ error: "New password must be at least 6 characters" }, { status: 400 });
  }
  
  try {
    const member = await (Member as any).findOne({ user_id });
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    
    const valid = await verifyPassword(old_password, member.password);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    
    const hashedNewPassword = await hashPassword(new_password);
    const updatedMember = await (Member as any).findByIdAndUpdate(
      member._id, 
      { password: hashedNewPassword }, 
      { new: true }
    ).lean();
    
    const currentUser = await getCurrentMember(req);
    
    const changedByName = currentUser?.full_name || currentUser?.user_id || "admin";
    const changedByRole = currentUser?.role || "unknown";
    
    await AuditLog.create({
      table_name: "Member",
      record_id: member._id,
      action: "UPDATE_PASSWORD",
      old_data: { password: member.password },
      new_data: { password: hashedNewPassword },
      changed_by: String(currentUser?._id || user_id),
      changed_at: new Date().toISOString(),
      description: `Password changed for user ${user_id} by ${changedByName} (${changedByRole})`,
    });
    
    return NextResponse.json({ data: updatedMember });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to change password" },
      { status: 400 }
    );
  }
}