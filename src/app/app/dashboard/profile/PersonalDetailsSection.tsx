"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Upload } from "lucide-react";

interface PersonalDetailsSectionProps {
  formData: any;
  handleChange: (field: string, value: any) => void;
  onPhotoUpload?: (file: File) => Promise<void>;
  isUploadingPhoto?: boolean;
}

export function PersonalDetailsSection({ formData, handleChange, onPhotoUpload, isUploadingPhoto }: PersonalDetailsSectionProps) {
  return (
    <Card className="shadow-elegant border-border/40">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <User className="h-5 w-5 text-primary" /> Personal Details
        </CardTitle>
        <CardDescription>Update your general personal records</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2 col-span-1 md:col-span-2">
          <Label htmlFor="profile_photo">Profile Photo</Label>
          <div className="flex items-center gap-3">
            <Input
              id="profile_photo_file"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && onPhotoUpload) {
                  onPhotoUpload(file);
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="flex items-center gap-2"
              disabled={isUploadingPhoto}
              onClick={() => document.getElementById("profile_photo_file")?.click()}
            >
              {isUploadingPhoto ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {isUploadingPhoto ? "Uploading..." : "Choose Photo"}
            </Button>
            {formData.profile_photo && (
              <span className="text-xs text-muted-foreground">Photo uploaded</span>
            )}
          </div>
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
          <Label htmlFor="father_name">Father&apos;s Name</Label>
          <Input
            id="father_name"
            value={formData.father_name}
            onChange={(e) => handleChange("father_name", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mother_name">Mother&apos;s Name</Label>
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
  );
}
