"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users } from "lucide-react";

interface NomineeDetailsSectionProps {
  formData: any;
  handleChange: (field: string, value: any) => void;
}

export function NomineeDetailsSection({ formData, handleChange }: NomineeDetailsSectionProps) {
  return (
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
  );
}
