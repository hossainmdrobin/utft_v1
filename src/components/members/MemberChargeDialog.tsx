import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MemberChargeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  memberName: string;
  onSuccess?: () => void;
}

export function MemberChargeDialog({
  open,
  onOpenChange,
  memberId,
  memberName,
  onSuccess,
}: MemberChargeDialogProps) {
  const currentYear = new Date().getFullYear();

  const [formData, setFormData] = useState({
    charge_type: "yearly_down_payment",
    amount: "",
    paidAmount: "",
    year: currentYear.toString(),
    dueDate: "",
    description: "",
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const amount = parseFloat(formData.amount) || 0;
      const paidAmount = parseFloat(formData.paidAmount) || 0;

      let status = "pending";
      if (paidAmount >= amount && amount > 0) {
        status = "paid";
      } else if (paidAmount > 0 && paidAmount < amount) {
        status = "partial";
      } else if (formData.dueDate && new Date(formData.dueDate) < new Date()) {
        status = "overdue";
      }

      const { error } = await supabase.from("member_charges").insert({
        member_id: memberId,
        charge_type: formData.charge_type,
        amount,
        paid_amount: paidAmount,
        year: parseInt(formData.year),
        due_date: formData.dueDate || null,
        description: formData.description || null,
        status,
        payment_date: paidAmount > 0 ? new Date().toISOString() : null,
      });

      if (error) throw error;

      toast.success("Charge added successfully");
      onOpenChange(false);
      onSuccess?.();

      // Reset form
      setFormData({
        charge_type: "yearly_down_payment",
        amount: "",
        paidAmount: "",
        year: currentYear.toString(),
        dueDate: "",
        description: "",
      });
    } catch (error: any) {
      console.error("Error adding charge:", error);
      toast.error(error.message || "Failed to add charge");
    } finally {
      setLoading(false);
    }
  };

  const chargeTypes = [
    { value: "yearly_down_payment", label: "Yearly Down Payment" },
    { value: "additional_charge", label: "Additional Charge" },
    { value: "adjustment", label: "Adjustment" },
  ];

  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Charge for {memberName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Charge Type</Label>
              <Select
                value={formData.charge_type}
                onValueChange={(value) => setFormData({ ...formData, charge_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {chargeTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
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

          <div className="space-y-2">
            <Label>Amount (৳)</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Paid Amount (৳)</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.paidAmount}
              onChange={(e) => setFormData({ ...formData, paidAmount: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Due Date</Label>
            <Input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Optional description for this charge"
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
              {loading ? "Adding..." : "Add Charge"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
