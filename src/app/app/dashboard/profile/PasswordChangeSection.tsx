"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useChangePasswordMutation } from "@/store/slices/memberSlice/api.member";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock } from "lucide-react";

interface PasswordChangeSectionProps {
  user_id: string;
  onPasswordChangeSuccess?: () => void;
}

export function PasswordChangeSection({ user_id, onPasswordChangeSuccess }: PasswordChangeSectionProps) {
  const { toast } = useToast();
  const [changePassword, { isLoading: isChangingPassword }] = useChangePasswordMutation();
  const [passwordData, setPasswordData] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [errors, setErrors] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });

  const validateForm = () => {
    const newErrors = { old_password: "", new_password: "", confirm_password: "" };
    let isValid = true;

    if (!passwordData.old_password) {
      newErrors.old_password = "Old password is required";
      isValid = false;
    }

    if (!passwordData.new_password) {
      newErrors.new_password = "New password is required";
      isValid = false;
    } else if (passwordData.new_password.length < 6) {
      newErrors.new_password = "New password must be at least 6 characters";
      isValid = false;
    }

    if (!passwordData.confirm_password) {
      newErrors.confirm_password = "Please confirm your new password";
      isValid = false;
    } else if (passwordData.new_password !== passwordData.confirm_password) {
      newErrors.confirm_password = "Passwords do not match";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleChange = (field: string, value: string) => {
    setPasswordData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await changePassword({
        user_id,
        old_password: passwordData.old_password,
        new_password: passwordData.new_password,
      }).unwrap();
      
      // Reset form on success
      setPasswordData({
        old_password: "",
        new_password: "",
        confirm_password: "",
      });
      onPasswordChangeSuccess?.();
      
      toast({
        title: "Password Changed",
        description: "Your password has been successfully updated.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Password Change Failed",
        description: err?.data?.error || "An error occurred while changing your password.",
      });
      // Set old_password error if password verification failed
      if (err?.data?.error?.includes("Invalid credentials")) {
        setErrors((prev) => ({ ...prev, old_password: "Old password is incorrect" }));
      }
    }
  };

  return (
    <Card className="shadow-elegant border-border/40">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" /> Change Password
        </CardTitle>
        <CardDescription>Update your account password. You must provide your current password to make changes.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="old_password">Current Password *</Label>
            <Input
              id="old_password"
              type="password"
              value={passwordData.old_password}
              onChange={(e) => handleChange("old_password", e.target.value)}
              placeholder="Enter your current password"
              className={errors.old_password ? "border-destructive" : ""}
            />
            {errors.old_password && (
              <p className="text-sm text-destructive">{errors.old_password}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="new_password">New Password *</Label>
            <Input
              id="new_password"
              type="password"
              value={passwordData.new_password}
              onChange={(e) => handleChange("new_password", e.target.value)}
              placeholder="Enter your new password"
              className={errors.new_password ? "border-destructive" : ""}
            />
            {errors.new_password && (
              <p className="text-sm text-destructive">{errors.new_password}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm_password">Confirm New Password *</Label>
            <Input
              id="confirm_password"
              type="password"
              value={passwordData.confirm_password}
              onChange={(e) => handleChange("confirm_password", e.target.value)}
              placeholder="Confirm your new password"
              className={errors.confirm_password ? "border-destructive" : ""}
            />
            {errors.confirm_password && (
              <p className="text-sm text-destructive">{errors.confirm_password}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="submit" disabled={isChangingPassword} className="px-8 py-6 text-base font-semibold">
              {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Password
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}