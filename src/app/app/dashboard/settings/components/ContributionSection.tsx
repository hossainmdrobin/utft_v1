"use client";

import { useEffect, useState } from "react";
import { DollarSign, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

interface ContributionSectionProps {
  settings: any;
  onUpdate: (value: any) => void;
  isAdmin: boolean;
  isSaving: boolean;
}

export function ContributionSection({ settings, onUpdate, isAdmin, isSaving }: ContributionSectionProps) {
  const [default_contribution_amount, setDefaultContributionAmount] = useState(0);
  const [default_due_day, setDefaultDueDay] = useState(10);

  useEffect(() => {
    if (settings) {
      setDefaultContributionAmount(settings.default_contribution_amount || 0);
      setDefaultDueDay(settings.default_due_day || 10);
    }
  }, [settings]);

  const handleSave = () => {
    onUpdate({
      default_contribution_amount: default_contribution_amount,
      default_due_day: default_due_day,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Default Contribution Settings
        </CardTitle>
        <CardDescription>Configure default monthly contribution amounts and due dates</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Default Monthly Contribution (৳)</Label>
            <Input
              type="number"
              value={default_contribution_amount}
              onChange={(e) => setDefaultContributionAmount(parseFloat(e.target.value) || 0)}
              disabled={!isAdmin}
            />
          </div>
          <div className="space-y-2">
            <Label>Default Due Day of Month</Label>
            <Input
              type="number"
              min={1}
              max={28}
              value={default_due_day}
              onChange={(e) =>
                setDefaultDueDay(Math.min(28, Math.max(1, parseInt(e.target.value) || 10)))
              }
              disabled={!isAdmin}
            />
          </div>
        </div>
        {isAdmin && (
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
