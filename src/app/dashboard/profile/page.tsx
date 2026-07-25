"use client";

import { useState, useEffect } from "react";
import { useGetCurrentUserQuery } from "@/store/slices/authSlice/api.auth";
import { useUpdateMemberMutation } from "@/store/slices/memberSlice/api.member";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { ProfileCard } from "./ProfileCard";
import { PersonalDetailsSection } from "./PersonalDetailsSection";
import { ContactDetailsSection } from "./ContactDetailsSection";
import { NomineeDetailsSection } from "./NomineeDetailsSection";

export default function ProfilePage() {
  const { toast } = useToast();
  const { data: currentUserData, isLoading: isAuthLoading, error: authError } = useGetCurrentUserQuery();
  const [updateMember, { isLoading: isUpdating }] = useUpdateMemberMutation();

  const member = currentUserData?.data?.member || null;

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

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

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

  const handlePhotoUpload = async (file: File) => {
    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Upload failed");
      handleChange("profile_photo", result.url);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: err?.message || "Failed to upload photo.",
      });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;

    try {
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

  if (isAuthLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (authError || !member) {
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
        <div className="space-y-6">
          <ProfileCard member={member} formData={formData} />
        </div>

        <div className="md:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            <PersonalDetailsSection formData={formData} handleChange={handleChange} onPhotoUpload={handlePhotoUpload} isUploadingPhoto={isUploadingPhoto} />
            <ContactDetailsSection formData={formData} handleChange={handleChange} />
            <NomineeDetailsSection formData={formData} handleChange={handleChange} />

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
