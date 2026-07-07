import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

type PaymentType = "donation" | "charge" | "fine";

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentType: PaymentType;
  record: {
    id: string;
    amount: number;
    paid_amount: number;
    description?: string;
    period?: string;
  };
  onSuccess?: () => void;
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  paymentType,
  record,
  onSuccess,
}: RecordPaymentDialogProps) {
  const remainingAmount = record.amount - record.paid_amount;
  
  const [formData, setFormData] = useState({
    amount: remainingAmount.toString(),
    notes: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const paymentAmount = parseFloat(formData.amount) || 0;
      
      if (paymentAmount <= 0) {
        toast.error("Payment amount must be greater than zero");
        setLoading(false);
        return;
      }

      if (paymentAmount > remainingAmount) {
        toast.error(`Payment amount cannot exceed remaining balance of ৳${remainingAmount.toFixed(2)}`);
        setLoading(false);
        return;
      }

      const newPaidAmount = record.paid_amount + paymentAmount;
      const newStatus = newPaidAmount >= record.amount ? "paid" : "partial";

      let error: any = null;

      switch (paymentType) {
        case "donation":
          const donationResult = await supabase
            .from("monthly_donations")
            .update({
              paid_amount: newPaidAmount,
              status: newStatus,
              payment_date: new Date().toISOString(),
              notes: formData.notes || null,
            })
            .eq("id", record.id);
          error = donationResult.error;
          break;
        case "charge":
          const chargeResult = await supabase
            .from("member_charges")
            .update({
              paid_amount: newPaidAmount,
              status: newStatus,
              payment_date: new Date().toISOString(),
            })
            .eq("id", record.id);
          error = chargeResult.error;
          break;
        case "fine":
          const fineResult = await supabase
            .from("fine_transactions")
            .update({
              paid_amount: newPaidAmount,
              status: newStatus,
              payment_date: new Date().toISOString(),
            })
            .eq("id", record.id);
          error = fineResult.error;
          break;
        default:
          throw new Error("Invalid payment type");
      }

      if (error) throw error;

      toast.success(`Payment of ৳${paymentAmount.toFixed(2)} recorded successfully`);
      onOpenChange(false);
      onSuccess?.();

      // Reset form
      setFormData({
        amount: "",
        notes: "",
      });
    } catch (error: any) {
      console.error("Error recording payment:", error);
      toast.error(error.message || "Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (paymentType) {
      case "donation":
        return "Record Donation Payment";
      case "charge":
        return "Record Charge Payment";
      case "fine":
        return "Record Fine Payment";
      default:
        return "Record Payment";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment Summary */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            {record.description && (
              <p className="text-sm font-medium">{record.description}</p>
            )}
            {record.period && (
              <p className="text-sm text-muted-foreground">{record.period}</p>
            )}
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground">Total</p>
                <p className="font-semibold">৳{record.amount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Paid</p>
                <p className="font-semibold text-green-600">৳{record.paid_amount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Remaining</p>
                <p className="font-semibold text-orange-600">৳{remainingAmount.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Payment Amount (৳)</Label>
              <Input
                type="number"
                step="0.01"
                max={remainingAmount}
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
              <div className="flex gap-2">
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => setFormData({ ...formData, amount: remainingAmount.toString() })}
                >
                  Pay Full: ৳{remainingAmount.toFixed(2)}
                </Badge>
                {remainingAmount > 100 && (
                  <Badge
                    variant="outline"
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => setFormData({ ...formData, amount: (remainingAmount / 2).toFixed(2) })}
                  >
                    Pay Half: ৳{(remainingAmount / 2).toFixed(2)}
                  </Badge>
                )}
              </div>
            </div>

            {paymentType === "donation" && (
              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  placeholder="Any additional notes about this payment"
                />
              </div>
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
              <Button type="submit" disabled={loading}>
                {loading ? "Recording..." : "Record Payment"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}