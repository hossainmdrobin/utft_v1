"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Phone } from "lucide-react";

interface ContactDetailsSectionProps {
  formData: any;
  handleChange: (field: string, value: any) => void;
}

export function ContactDetailsSection({ formData, handleChange }: ContactDetailsSectionProps) {
  return (
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
  );
}
