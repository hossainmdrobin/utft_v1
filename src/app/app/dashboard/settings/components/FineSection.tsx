"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

interface FineSectionProps {
  settings: any;
  onUpdate: (value: any) => void;
  isAdmin: boolean;
  isSaving: boolean;
}

export function FineSection({ settings, onUpdate, isAdmin, isSaving }: FineSectionProps) {
  const [fine_enabled, setFineEnabled] = useState(true);

  useEffect(() => {
    if (settings) {
      setFineEnabled(settings.fine_enabled ?? true);
    }
  }, [settings]);

  const handleSave = () => {
    onUpdate({ fine_enabled: fine_enabled });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Fine Settings
        </CardTitle>
        <CardDescription>Configure automatic fine calculation settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Switch
            checked={fine_enabled}
            onCheckedChange={setFineEnabled}
            disabled={!isAdmin}
          />
          <Label>Enable Automatic Fines</Label>
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
