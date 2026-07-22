import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/mongodb/client";
import { toast } from "sonner";
import { useAdmin } from "@/hooks/use-admin";
import { triggerFineCalculation } from "@/hooks/use-member-financials";
import { Plus, Edit, Trash2, Calculator, AlertTriangle, Users } from "lucide-react";
import { BulkContributionDialog } from "./BulkContributionDialog";

interface FineRule {
  id: string;
  name: string;
  fine_type: "fixed" | "percentage";
  fine_value: number;
  grace_period_days: number;
  is_cumulative: boolean;
  cumulative_frequency: "daily" | "weekly" | "monthly" | null;
  max_fine_amount: number | null;
  is_active: boolean;
}

interface ContributionSettings {
  default_contribution_amount: number;
  default_due_day: number;
  fine_enabled: boolean;
}

export function ContributionSettings() {
  const { isAdmin } = useAdmin();
  const [fineRules, setFineRules] = useState<FineRule[]>([]);
  const [settings, setSettings] = useState<ContributionSettings>({
    default_contribution_amount: 0,
    default_due_day: 10,
    fine_enabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<FineRule | null>(null);
  const [calculating, setCalculating] = useState(false);

  const [ruleForm, setRuleForm] = useState({
    name: "",
    fine_type: "fixed" as "fixed" | "percentage",
    fine_value: 0,
    grace_period_days: 5,
    is_cumulative: false,
    cumulative_frequency: "monthly" as "daily" | "weekly" | "monthly",
    max_fine_amount: "",
    is_active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch fine rules
      const { data: rulesData, error: rulesError } = await supabase
        .from("fine_rules")
        .select("*")
        .order("created_at", { ascending: false });

      if (rulesError) throw rulesError;
      setFineRules((rulesData || []).map(r => ({
        ...r,
        fine_type: r.fine_type as "fixed" | "percentage",
        cumulative_frequency: r.cumulative_frequency as "daily" | "weekly" | "monthly" | null,
      })));

      // Fetch organization settings
      const { data: settingsData, error: settingsError } = await supabase
        .from("organization_settings")
        .select("key, value")
        .in("key", ["default_contribution_amount", "default_due_day", "fine_enabled"]);

      if (settingsError) throw settingsError;

      const settingsMap: Record<string, any> = {};
      settingsData?.forEach((s) => {
        settingsMap[s.key] = s.value;
      });

      setSettings({
        default_contribution_amount: settingsMap.default_contribution_amount?.amount || 0,
        default_due_day: settingsMap.default_due_day?.day || 10,
        fine_enabled: settingsMap.fine_enabled?.enabled ?? true,
      });
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!isAdmin) return;
    setSaving(true);

    try {
      // Update each setting
      await supabase
        .from("organization_settings")
        .upsert([
          { key: "default_contribution_amount", value: { amount: settings.default_contribution_amount } },
          { key: "default_due_day", value: { day: settings.default_due_day } },
          { key: "fine_enabled", value: { enabled: settings.fine_enabled } },
        ], { onConflict: "key" });

      toast.success("Settings saved successfully");
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const openAddDialog = () => {
    setEditingRule(null);
    setRuleForm({
      name: "",
      fine_type: "fixed",
      fine_value: 0,
      grace_period_days: 5,
      is_cumulative: false,
      cumulative_frequency: "monthly",
      max_fine_amount: "",
      is_active: true,
    });
    setEditDialogOpen(true);
  };

  const openEditDialog = (rule: FineRule) => {
    setEditingRule(rule);
    setRuleForm({
      name: rule.name,
      fine_type: rule.fine_type,
      fine_value: rule.fine_value,
      grace_period_days: rule.grace_period_days,
      is_cumulative: rule.is_cumulative,
      cumulative_frequency: rule.cumulative_frequency || "monthly",
      max_fine_amount: rule.max_fine_amount?.toString() || "",
      is_active: rule.is_active,
    });
    setEditDialogOpen(true);
  };

  const saveRule = async () => {
    if (!isAdmin) return;

    try {
      const ruleData = {
        name: ruleForm.name,
        fine_type: ruleForm.fine_type,
        fine_value: ruleForm.fine_value,
        grace_period_days: ruleForm.grace_period_days,
        is_cumulative: ruleForm.is_cumulative,
        cumulative_frequency: ruleForm.is_cumulative ? ruleForm.cumulative_frequency : null,
        max_fine_amount: ruleForm.max_fine_amount ? parseFloat(ruleForm.max_fine_amount) : null,
        is_active: ruleForm.is_active,
      };

      if (editingRule) {
        const { error } = await supabase
          .from("fine_rules")
          .update(ruleData)
          .eq("id", editingRule.id);
        if (error) throw error;
        toast.success("Fine rule updated");
      } else {
        const { error } = await supabase.from("fine_rules").insert(ruleData);
        if (error) throw error;
        toast.success("Fine rule created");
      }

      setEditDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error("Error saving rule:", error);
      toast.error("Failed to save fine rule");
    }
  };

  const deleteRule = async (id: string) => {
    if (!isAdmin) return;
    if (!confirm("Are you sure you want to delete this fine rule?")) return;

    try {
      const { error } = await supabase.from("fine_rules").delete().eq("id", id);
      if (error) throw error;
      toast.success("Fine rule deleted");
      fetchData();
    } catch (error: any) {
      console.error("Error deleting rule:", error);
      toast.error("Failed to delete fine rule");
    }
  };

  const toggleRuleActive = async (id: string, isActive: boolean) => {
    if (!isAdmin) return;

    try {
      // If activating, deactivate all others first
      if (isActive) {
        await supabase.from("fine_rules").update({ is_active: false }).neq("id", id);
      }

      const { error } = await supabase
        .from("fine_rules")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;

      toast.success(isActive ? "Fine rule activated" : "Fine rule deactivated");
      fetchData();
    } catch (error: any) {
      console.error("Error toggling rule:", error);
      toast.error("Failed to update rule status");
    }
  };

  const handleCalculateFines = async () => {
    setCalculating(true);
    try {
      await triggerFineCalculation();
      toast.success("Fines calculated successfully");
    } catch (error: any) {
      console.error("Error calculating fines:", error);
      toast.error("Failed to calculate fines");
    } finally {
      setCalculating(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Bulk Contribution Generation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Bulk Contribution Generation</CardTitle>
              <CardDescription>
                Generate monthly contributions for all active members at once
              </CardDescription>
            </div>
            {isAdmin && (
              <Button onClick={() => setBulkDialogOpen(true)}>
                <Users className="h-4 w-4 mr-2" />
                Generate Contributions
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Use this feature to create monthly contribution records for all active members. 
            You can choose the month, year, and contribution amount. Existing contributions 
            for the selected period will be skipped by default.
          </p>
        </CardContent>
      </Card>

      {/* Default Contribution Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Default Contribution Settings</CardTitle>
          <CardDescription>
            Configure default monthly contribution amounts and due dates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Default Monthly Contribution (৳)</Label>
              <Input
                type="number"
                value={settings.default_contribution_amount}
                onChange={(e) =>
                  setSettings({ ...settings, default_contribution_amount: parseFloat(e.target.value) || 0 })
                }
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label>Default Due Day of Month</Label>
              <Input
                type="number"
                min={1}
                max={28}
                value={settings.default_due_day}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    default_due_day: Math.min(28, Math.max(1, parseInt(e.target.value) || 10)),
                  })
                }
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label>Enable Automatic Fines</Label>
              <div className="flex items-center gap-2 pt-2">
                <Switch
                  checked={settings.fine_enabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, fine_enabled: checked })
                  }
                  disabled={!isAdmin}
                />
                <span className="text-sm text-muted-foreground">
                  {settings.fine_enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
          </div>
          {isAdmin && (
            <Button onClick={saveSettings} disabled={saving}>
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Fine Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Fine Rules</CardTitle>
              <CardDescription>
                Configure automatic fine calculation rules for late payments
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {isAdmin && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleCalculateFines}
                    disabled={calculating}
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    {calculating ? "Calculating..." : "Calculate Fines Now"}
                  </Button>
                  <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={openAddDialog}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Rule
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>
                          {editingRule ? "Edit Fine Rule" : "Add Fine Rule"}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Rule Name</Label>
                          <Input
                            value={ruleForm.name}
                            onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                            placeholder="e.g., Late Payment Fine"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Fine Type</Label>
                            <Select
                              value={ruleForm.fine_type}
                              onValueChange={(v) =>
                                setRuleForm({ ...ruleForm, fine_type: v as "fixed" | "percentage" })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="fixed">Fixed Amount</SelectItem>
                                <SelectItem value="percentage">Percentage</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>
                              {ruleForm.fine_type === "fixed" ? "Amount (৳)" : "Percentage (%)"}
                            </Label>
                            <Input
                              type="number"
                              value={ruleForm.fine_value}
                              onChange={(e) =>
                                setRuleForm({ ...ruleForm, fine_value: parseFloat(e.target.value) || 0 })
                              }
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Grace Period (Days)</Label>
                          <Input
                            type="number"
                            min={0}
                            value={ruleForm.grace_period_days}
                            onChange={(e) =>
                              setRuleForm({
                                ...ruleForm,
                                grace_period_days: parseInt(e.target.value) || 0,
                              })
                            }
                          />
                          <p className="text-xs text-muted-foreground">
                            Days after due date before fine applies
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={ruleForm.is_cumulative}
                            onCheckedChange={(checked) =>
                              setRuleForm({ ...ruleForm, is_cumulative: checked })
                            }
                          />
                          <Label>Cumulative Fine (accumulates over time)</Label>
                        </div>
                        {ruleForm.is_cumulative && (
                          <div className="space-y-2">
                            <Label>Accumulation Frequency</Label>
                            <Select
                              value={ruleForm.cumulative_frequency}
                              onValueChange={(v) =>
                                setRuleForm({
                                  ...ruleForm,
                                  cumulative_frequency: v as "daily" | "weekly" | "monthly",
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label>Maximum Fine Cap (৳) - Optional</Label>
                          <Input
                            type="number"
                            value={ruleForm.max_fine_amount}
                            onChange={(e) =>
                              setRuleForm({ ...ruleForm, max_fine_amount: e.target.value })
                            }
                            placeholder="No limit"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={ruleForm.is_active}
                            onCheckedChange={(checked) =>
                              setRuleForm({ ...ruleForm, is_active: checked })
                            }
                          />
                          <Label>Active</Label>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={saveRule}>
                            {editingRule ? "Update" : "Create"}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {fineRules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No fine rules configured</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Grace Period</TableHead>
                  <TableHead>Cumulative</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {fineRules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell className="capitalize">{rule.fine_type}</TableCell>
                    <TableCell>
                      {rule.fine_type === "fixed"
                        ? `৳${rule.fine_value}`
                        : `${rule.fine_value}%`}
                    </TableCell>
                    <TableCell>{rule.grace_period_days} days</TableCell>
                    <TableCell>
                      {rule.is_cumulative ? (
                        <span className="capitalize">{rule.cumulative_frequency}</span>
                      ) : (
                        "No"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={rule.is_active ? "default" : "secondary"}>
                        {rule.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRuleActive(rule.id, !rule.is_active)}
                          >
                            {rule.is_active ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(rule)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteRule(rule.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <BulkContributionDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        onSuccess={fetchData}
      />
    </div>
  );
}
