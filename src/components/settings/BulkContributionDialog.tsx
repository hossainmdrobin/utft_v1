import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Users } from "lucide-react";

interface BulkContributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function BulkContributionDialog({
  open,
  onOpenChange,
  onSuccess,
}: BulkContributionDialogProps) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [formData, setFormData] = useState({
    month: currentMonth.toString(),
    year: currentYear.toString(),
    amount: "",
    dueDay: "10",
    skipExisting: true,
  });

  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{
    totalMembers: number;
    existingDonations: number;
    toBeCreated: number;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Fetch default contribution amount on mount
  useEffect(() => {
    const fetchDefaults = async () => {
      try {
        const { data } = await supabase
          .from("organization_settings")
          .select("key, value")
          .in("key", ["default_contribution_amount", "default_due_day"]);

        if (data) {
          const settings: Record<string, any> = {};
          data.forEach((s) => {
            settings[s.key] = s.value;
          });

          setFormData((prev) => ({
            ...prev,
            amount: settings.default_contribution_amount?.amount?.toString() || prev.amount,
            dueDay: settings.default_due_day?.day?.toString() || prev.dueDay,
          }));
        }
      } catch (error) {
        console.error("Error fetching defaults:", error);
      }
    };

    if (open) {
      fetchDefaults();
    }
  }, [open]);

  // Fetch preview data when month/year changes
  useEffect(() => {
    const fetchPreview = async () => {
      if (!open) return;
      
      setPreviewLoading(true);
      try {
        // Get active members count
        const { count: totalMembers } = await supabase
          .from("members")
          .select("*", { count: "exact", head: true })
          .eq("status", "active");

        // Get existing donations for this month/year
        const { count: existingDonations } = await supabase
          .from("monthly_donations")
          .select("*", { count: "exact", head: true })
          .eq("month", parseInt(formData.month))
          .eq("year", parseInt(formData.year));

        setPreview({
          totalMembers: totalMembers || 0,
          existingDonations: existingDonations || 0,
          toBeCreated: formData.skipExisting
            ? (totalMembers || 0) - (existingDonations || 0)
            : totalMembers || 0,
        });
      } catch (error) {
        console.error("Error fetching preview:", error);
      } finally {
        setPreviewLoading(false);
      }
    };

    fetchPreview();
  }, [open, formData.month, formData.year, formData.skipExisting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error("Please enter a valid contribution amount");
      return;
    }

    setLoading(true);

    try {
      const month = parseInt(formData.month);
      const year = parseInt(formData.year);
      const amount = parseFloat(formData.amount);
      const dueDay = parseInt(formData.dueDay);

      // Calculate due date
      const dueDate = new Date(year, month - 1, dueDay);
      const dueDateStr = dueDate.toISOString().split("T")[0];

      // Get all active members
      const { data: members, error: membersError } = await supabase
        .from("members")
        .select("id")
        .eq("status", "active");

      if (membersError) throw membersError;

      if (!members || members.length === 0) {
        toast.error("No active members found");
        setLoading(false);
        return;
      }

      let memberIds = members.map((m) => m.id);

      // If skipping existing, filter out members who already have donations for this period
      if (formData.skipExisting) {
        const { data: existingDonations } = await supabase
          .from("monthly_donations")
          .select("member_id")
          .eq("month", month)
          .eq("year", year);

        const existingMemberIds = new Set(existingDonations?.map((d) => d.member_id) || []);
        memberIds = memberIds.filter((id) => !existingMemberIds.has(id));
      }

      if (memberIds.length === 0) {
        toast.info("All active members already have contributions for this period");
        onOpenChange(false);
        return;
      }

      // Create donations for all members
      const donations = memberIds.map((memberId) => ({
        member_id: memberId,
        month,
        year,
        amount,
        paid_amount: 0,
        due_date: dueDateStr,
        status: "pending",
      }));

      // Insert in batches of 100
      const batchSize = 100;
      for (let i = 0; i < donations.length; i += batchSize) {
        const batch = donations.slice(i, i + batchSize);
        const { error } = await supabase.from("monthly_donations").insert(batch);
        if (error) throw error;
      }

      toast.success(`Created ${memberIds.length} contribution records for ${getMonthName(month)} ${year}`);
      onOpenChange(false);
      onSuccess?.();

      // Reset form
      setFormData({
        month: currentMonth.toString(),
        year: currentYear.toString(),
        amount: "",
        dueDay: "10",
        skipExisting: true,
      });
    } catch (error: any) {
      console.error("Error creating bulk contributions:", error);
      toast.error(error.message || "Failed to create contributions");
    } finally {
      setLoading(false);
    }
  };

  const getMonthName = (month: number) => {
    return new Date(2000, month - 1).toLocaleString("en-US", { month: "long" });
  };

  const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Bulk Contributions</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Preview Stats */}
          {preview && !previewLoading && (
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="font-medium">Preview</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Active Members</p>
                  <p className="font-semibold">{preview.totalMembers}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Existing</p>
                  <p className="font-semibold text-orange-600">{preview.existingDonations}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">To Create</p>
                  <p className="font-semibold text-green-600">{preview.toBeCreated}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Month</Label>
              <Select
                value={formData.month}
                onValueChange={(value) => setFormData({ ...formData, month: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Year</Label>
              <Select
                value={formData.year}
                onValueChange={(value) => setFormData({ ...formData, year: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Contribution Amount (৳)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="Enter amount"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Due Day of Month</Label>
              <Input
                type="number"
                min={1}
                max={28}
                value={formData.dueDay}
                onChange={(e) => setFormData({ ...formData, dueDay: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="skipExisting"
              checked={formData.skipExisting}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, skipExisting: checked as boolean })
              }
            />
            <label
              htmlFor="skipExisting"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Skip members who already have contributions for this period
            </label>
          </div>

          {!formData.skipExisting && preview && preview.existingDonations > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Warning: This will create duplicate entries for {preview.existingDonations} members
                who already have contributions for this period.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || (preview?.toBeCreated === 0 && formData.skipExisting)}
            >
              {loading ? "Creating..." : `Create ${preview?.toBeCreated || 0} Contributions`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}