import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/mongodb/client";
import { toast } from "sonner";

interface ShareReceivable {
  id: string;
  member_id: string;
  year: number;
  month: number;
  share_quantity: number;
  share_price: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number | null;
  status: string;
  member?: {
    id: string;
    full_name: string;
    beneficiary_id: string | null;
    share_quantity: number;
  };
}

interface MarkAsPaidDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receivable: ShareReceivable;
  onSuccess?: () => void;
}

export function MarkAsPaidDialog({
  open,
  onOpenChange,
  receivable,
  onSuccess,
}: MarkAsPaidDialogProps) {
  const remainingAmount =
    receivable.remaining_amount ??
    Number(receivable.total_amount) - Number(receivable.paid_amount);

  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [paidAmount, setPaidAmount] = useState(remainingAmount.toString());
  const [loading, setLoading] = useState(false);

  const calculatedRemaining = remainingAmount - (parseFloat(paidAmount) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const paymentValue = parseFloat(paidAmount) || 0;

      if (paymentValue <= 0) {
        toast.error("Payment amount must be greater than zero");
        setLoading(false);
        return;
      }

      if (paymentValue > remainingAmount) {
        toast.error(`Payment cannot exceed remaining balance of ৳${remainingAmount.toFixed(2)}`);
        setLoading(false);
        return;
      }

      const newPaidAmount = Number(receivable.paid_amount) + paymentValue;
      const newStatus =
        newPaidAmount >= Number(receivable.total_amount) ? "paid" : "partial";

      const { error } = await supabase
        .from("share_receivables")
        .update({
          paid_amount: newPaidAmount,
          status: newStatus,
          payment_date: paymentDate.toISOString(),
        })
        .eq("id", receivable.id);

      if (error) throw error;

      await postPaymentToLedger(paymentValue);

      toast.success(`Payment of ৳${paymentValue.toFixed(2)} recorded successfully`);
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error recording payment:", error);
      toast.error(error.message || "Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  const postPaymentToLedger = async (amount: number) => {
    try {
      const monthName = new Date(receivable.year, receivable.month - 1, 1).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });

      const res = await fetch("/app/dashboard/payments/api/post-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType: "share",
          sourceId: receivable.id,
          paymentReference: receivable.id,
          memberId: receivable.member_id,
          paymentDate: paymentDate.toISOString(),
          amount,
          description: `Share payment received from ${receivable.member?.full_name || "Member"} for ${monthName}`,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to post payment to ledger");
      }
    } catch (error) {
      console.error("Error posting payment to ledger:", error);
      toast.warning(`Payment recorded, but ledger entry failed: ${(error as Error).message}. It can be retried.`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Share Payment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Member Info - Non-editable */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Member Name</Label>
                <p className="font-medium">{receivable.member?.full_name || "Unknown"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Member ID</Label>
                <p className="font-medium">{receivable.member?.beneficiary_id || "-"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Total No. of Shares</Label>
                <p className="font-medium">{receivable.member?.share_quantity || receivable.share_quantity}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Total Amount of Shares</Label>
                <p className="font-medium">৳{Number(receivable.total_amount).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Payment Date */}
          <div className="space-y-2">
            <Label>Payment Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !paymentDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {paymentDate ? format(paymentDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={paymentDate}
                  onSelect={(date) => date && setPaymentDate(date)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Paid Amount */}
          <div className="space-y-2">
            <Label>Paid Amount (৳)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max={remainingAmount}
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              required
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPaidAmount(remainingAmount.toString())}
              >
                Pay Full: ৳{remainingAmount.toLocaleString()}
              </Button>
              {remainingAmount > 100 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPaidAmount((remainingAmount / 2).toFixed(2))}
                >
                  Pay Half: ৳{(remainingAmount / 2).toLocaleString()}
                </Button>
              )}
            </div>
          </div>

          {/* Receivable Remaining */}
          <div className="p-4 rounded-lg bg-muted/50">
            <Label className="text-xs text-muted-foreground">Receivable Remaining</Label>
            <p className={cn("text-xl font-bold", calculatedRemaining > 0 ? "text-orange-600" : "text-green-600")}>
              ৳{calculatedRemaining.toLocaleString()}
            </p>
          </div>

          {/* Actions */}
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
      </DialogContent>
    </Dialog>
  );
}
