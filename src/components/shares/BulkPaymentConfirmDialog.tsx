import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface PaymentSummaryItem {
  id: string;
  memberName: string;
  beneficiaryId: string | null;
  period: string;
  totalAmount: number;
  paidAmount: number;
  paymentAmount: number;
  newStatus: string;
}

interface BulkPaymentConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  paymentDate: Date;
  payments: PaymentSummaryItem[];
  totalPaymentAmount: number;
  loading: boolean;
}

export function BulkPaymentConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  paymentDate,
  payments,
  totalPaymentAmount,
  loading,
}: BulkPaymentConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Bulk Payment</AlertDialogTitle>
          <AlertDialogDescription>
            You are about to record {payments.length} payment(s) totaling ৳{totalPaymentAmount.toLocaleString()} 
            for {format(paymentDate, "PPP")}. Please review the summary below.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Payment Date</p>
              <p className="font-medium">{format(paymentDate, "PPP")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-xl font-bold text-primary">৳{totalPaymentAmount.toLocaleString()}</p>
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-sm font-medium mb-2">Payment Details ({payments.length} items)</p>
            <ScrollArea className="h-[200px] rounded-md border p-2">
              <div className="space-y-2">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/30"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{payment.memberName}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{payment.beneficiaryId || "-"}</span>
                        <span>•</span>
                        <span>{payment.period}</span>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-medium">৳{payment.paymentAmount.toLocaleString()}</p>
                      <Badge 
                        variant={payment.newStatus === "paid" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {payment.newStatus === "paid" ? "Full Payment" : "Partial"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={loading}>
            {loading ? "Processing..." : `Confirm ${payments.length} Payments`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
