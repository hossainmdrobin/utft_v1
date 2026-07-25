"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Shield, Mail, Phone } from "lucide-react";

interface ProfileCardProps {
  member: any;
  formData: any;
}

export function ProfileCard({ member, formData }: ProfileCardProps) {
  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-elegant border-border/40">
        <CardHeader className="text-center pb-2">
          <div className="relative mx-auto mb-4 group">
            <Avatar className="h-24 w-24 mx-auto border-2 border-primary/20">
              <AvatarImage src={formData.profile_photo} alt={formData.full_name} />
              <AvatarFallback className="text-2xl font-semibold bg-primary/10 text-primary">
                {getInitials(formData.full_name)}
              </AvatarFallback>
            </Avatar>
          </div>
          <CardTitle className="text-xl font-bold">{formData.full_name || member.full_name}</CardTitle>
          <CardDescription className="flex items-center justify-center gap-2 mt-1">
            <Badge variant="secondary" className="capitalize">
              {member.role || "Member"}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {formData.member_type}
            </Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4 border-t border-border/40">
          <div className="flex items-center gap-3 text-sm">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">User ID</p>
              <p className="text-foreground">{member.user_id}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">Email Address</p>
              <p className="text-foreground">{formData.email || "N/A"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">Mobile Number</p>
              <p className="text-foreground">{formData.mobile || "N/A"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-elegant border-border/40">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Security Note</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2">
          <p>For security reasons, your User ID, Account Role, and created details cannot be changed from this profile page.</p>
          <p>If you need to change your password, please contact the administration department.</p>
        </CardContent>
      </Card>
    </div>
  );
}
