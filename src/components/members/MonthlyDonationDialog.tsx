import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MonthlyDonationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  memberName: string;
  onSuccess?: () => void;
}

export function MonthlyDonationDialog({
  open,
  onOpenChange,
  memberId,
  memberName,
  onSuccess,
}: MonthlyDonationDialogProps) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [formData, setFormData] = useState({
    month: currentMonth.toString(),
    year: currentYear.toString(),
    amount: "",
    paidAmount: "",
    status: "pending",
    dueDate: "",
    notes: "",
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const amount = parseFloat(formData.amount) || 0;
      const paidAmount = parseFloat(formData.paidAmount) || 0;

      let status = formData.status;
      if (paidAmount >= amount && amount > 0) {
        status = "paid";
      } else if (paidAmount > 0 && paidAmount < amount) {
        status = "partial";
      } else if (formData.dueDate && new Date(formData.dueDate) < new Date()) {
        status = "overdue";
      }

      const { error } = await supabase.from("monthly_donations").insert({
        member_id: memberId,
        month: parseInt(formData.month),
        year: parseInt(formData.year),
        amount,
        paid_amount: paidAmount,
        payment_date: paidAmount > 0 ? new Date().toISOString() : null,
        due_date: formData.dueDate || null,
        status,
        notes: formData.notes || null,
      });

      if (error) throw error;

      toast.success("Monthly donation added successfully");
      onOpenChange(false);
      onSuccess?.();
      
      // Reset form
      setFormData({
        month: currentMonth.toString(),
        year: currentYear.toString(),
        amount: "",
        paidAmount: "",
        status: "pending",
        dueDate: "",
        notes: "",
      });
    } catch (error: any) {
      console.error("Error adding monthly donation:", error);
      toast.error(error.message || "Failed to add monthly donation");
    } finally {
      setLoading(false);
    }
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

  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Monthly Donation for {memberName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="month">Month</Label>
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
              <Label htmlFor="year">Year</Label>
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

          <div className="space-y-2">
            <Label htmlFor="amount">Donation Amount (৳)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paidAmount">Paid Amount (৳)</Label>
            <Input
              id="paidAmount"
              type="number"
              step="0.01"
              value={formData.paidAmount}
              onChange={(e) => setFormData({ ...formData, paidAmount: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Donation"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
