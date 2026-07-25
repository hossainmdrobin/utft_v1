"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/mongodb/client";
import { useGetMembersQuery, useUpdateMemberMutation } from "@/store/slices/memberSlice/api.member";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, User, Mail, Phone, MapPin, Calendar, Briefcase, Shield, Award, Users } from "lucide-react";

export default function ProfilePage() {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Fetch current user from session
  useEffect(() => {
    supabase.auth.getUser()
      .then(({ data }) => {
        setCurrentUser(data.user);
      })
      .finally(() => {
        setAuthLoading(false);
      });
  }, []);

  const { data: membersResponse, isLoading: membersLoading } = useGetMembersQuery();
  const [updateMember, { isLoading: isUpdating }] = useUpdateMemberMutation();

  const members = membersResponse?.data || [];
  const member = members.find((m: any) => m.user_id === currentUser?.id);

  const [formData, setFormData] = useState<any>({
    profile_photo: "",
    full_name: "",
    father_name: "",
    mother_name: "",
    date_of_birth: "",
    gender: "",
    profession: "",
    nationality: "",
    religion: "",
    blood_group: "",
    education: "",
    present_address: "",
    permanent_address: "",
    nid: "",
    mobile: "",
    email: "",
    member_type: "",
    share_quantity: 0,
    nominee_name: "",
    nominee_relation: "",
    nominee_nid: "",
  });

  // Sync loaded member data to state
  useEffect(() => {
    if (member) {
      setFormData({
        profile_photo: member.profile_photo || "",
        full_name: member.full_name || "",
        father_name: member.father_name || "",
        mother_name: member.mother_name || "",
        date_of_birth: member.date_of_birth || "",
        gender: member.gender || "",
        profession: member.profession || "",
        nationality: member.nationality || "",
        religion: member.religion || "",
        blood_group: member.blood_group || "",
        education: member.education || "",
        present_address: member.present_address || "",
        permanent_address: member.permanent_address || "",
        nid: member.nid || "",
        mobile: member.mobile || "",
        email: member.email || "",
        member_type: member.member_type || "general",
        share_quantity: member.share_quantity || 0,
        nominee_name: member.nominee_name || "",
        nominee_relation: member.nominee_relation || "",
        nominee_nid: member.nominee_nid || "",
      });
    }
  }, [member]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;

    try {
      // Don't send user_id, password, role, createdBy, or _id in the body
      const { user_id, password, role, createdBy, _id, ...safeUpdateData } = formData;
      await updateMember({
        id: member._id,
        ...safeUpdateData,
      }).unwrap();

      toast({
        title: "Profile Updated",
        description: "Your profile information has been successfully updated.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: err?.data?.error || "An error occurred while updating your profile.",
      });
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  if (authLoading || membersLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentUser || !member) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-2">
        <p className="text-muted-foreground text-lg">No profile found or you are not logged in.</p>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl py-8 space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">My Profile</h2>
          <p className="text-muted-foreground mt-1">View and manage your trust account details</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left column: Overview Card */}
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

        {/* Right column: Form */}
        <div className="md:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Details */}
            <Card className="shadow-elegant border-border/40">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" /> Personal Details
                </CardTitle>
                <CardDescription>Update your general personal records</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <Label htmlFor="profile_photo">Profile Photo URL</Label>
                  <Input
                    id="profile_photo"
                    placeholder="https://example.com/photo.jpg"
                    value={formData.profile_photo}
                    onChange={(e) => handleChange("profile_photo", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => handleChange("full_name", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => handleChange("date_of_birth", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="father_name">Father's Name</Label>
                  <Input
                    id="father_name"
                    value={formData.father_name}
                    onChange={(e) => handleChange("father_name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mother_name">Mother's Name</Label>
                  <Input
                    id="mother_name"
                    value={formData.mother_name}
                    onChange={(e) => handleChange("mother_name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={formData.gender} onValueChange={(value) => handleChange("gender", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="blood_group">Blood Group</Label>
                  <Select value={formData.blood_group} onValueChange={(value) => handleChange("blood_group", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select blood group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A+">A+</SelectItem>
                      <SelectItem value="A-">A-</SelectItem>
                      <SelectItem value="B+">B+</SelectItem>
                      <SelectItem value="B-">B-</SelectItem>
                      <SelectItem value="AB+">AB+</SelectItem>
                      <SelectItem value="AB-">AB-</SelectItem>
                      <SelectItem value="O+">O+</SelectItem>
                      <SelectItem value="O-">O-</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="religion">Religion</Label>
                  <Input
                    id="religion"
                    value={formData.religion}
                    onChange={(e) => handleChange("religion", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nationality">Nationality</Label>
                  <Input
                    id="nationality"
                    value={formData.nationality}
                    onChange={(e) => handleChange("nationality", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profession">Profession</Label>
                  <Input
                    id="profession"
                    value={formData.profession}
                    onChange={(e) => handleChange("profession", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="education">Education</Label>
                  <Input
                    id="education"
                    value={formData.education}
                    onChange={(e) => handleChange("education", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Contact Details */}
            <Card className="shadow-elegant border-border/40">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Phone className="h-5 w-5 text-primary" /> Contact Details
                </CardTitle>
                <CardDescription>Update your contact and address details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mobile">Mobile Number</Label>
                    <Input
                      id="mobile"
                      type="tel"
                      value={formData.mobile}
                      onChange={(e) => handleChange("mobile", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 col-span-1 md:col-span-2">
                    <Label htmlFor="nid">National ID (NID)</Label>
                    <Input
                      id="nid"
                      value={formData.nid}
                      onChange={(e) => handleChange("nid", e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="present_address">Present Address</Label>
                  <Textarea
                    id="present_address"
                    value={formData.present_address}
                    onChange={(e) => handleChange("present_address", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="permanent_address">Permanent Address</Label>
                  <Textarea
                    id="permanent_address"
                    value={formData.permanent_address}
                    onChange={(e) => handleChange("permanent_address", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Nominee Details */}
            <Card className="shadow-elegant border-border/40">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" /> Nominee Details
                </CardTitle>
                <CardDescription>Manage your beneficiary nominee information</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nominee_name">Nominee Name</Label>
                  <Input
                    id="nominee_name"
                    value={formData.nominee_name}
                    onChange={(e) => handleChange("nominee_name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nominee_relation">Nominee Relation</Label>
                  <Input
                    id="nominee_relation"
                    value={formData.nominee_relation}
                    onChange={(e) => handleChange("nominee_relation", e.target.value)}
                  />
                </div>
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <Label htmlFor="nominee_nid">Nominee NID</Label>
                  <Input
                    id="nominee_nid"
                    value={formData.nominee_nid}
                    onChange={(e) => handleChange("nominee_nid", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button type="submit" disabled={isUpdating} className="px-8 py-6 text-base font-semibold">
                {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
