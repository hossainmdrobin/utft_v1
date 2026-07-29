import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Banknote } from "lucide-react";
import { PaymentStatusBadge } from "@/components/members/PaymentStatusBadge";

interface FinancialSummaryCardProps {
  financialSummary: any;
  financialLoading: boolean;
}

export function FinancialSummaryCard({ financialSummary, financialLoading }: FinancialSummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Banknote className="h-5 w-5" />
          Financial Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        {financialLoading ? (
          <div className="text-center py-4 text-muted-foreground">Loading...</div>
        ) : financialSummary ? (
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1 p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Total Shares Value</p>
              <p className="text-2xl font-bold">৳{financialSummary.total_contributions.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">
                Paid: ৳{financialSummary.total_paid.toFixed(2)}
              </p>
            </div>
            <div className="space-y-1 p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Shares Due</p>
              <p className="text-2xl font-bold text-orange-600">৳{financialSummary.total_due.toFixed(2)}</p>
            </div>
            <div className="space-y-1 p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Total Fines (Late Share Payment)</p>
              <p className="text-2xl font-bold text-red-600">৳{financialSummary.total_fines.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">
                Pending: ৳{financialSummary.fines_pending.toFixed(2)}
              </p>
            </div>
            <div className="space-y-1 p-4 rounded-lg bg-primary/10">
              <p className="text-sm text-muted-foreground">Grand Total Due</p>
              <p className="text-2xl font-bold text-primary">৳{financialSummary.grand_total_due.toFixed(2)}</p>
              <PaymentStatusBadge status={financialSummary.payment_status} />
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            No financial data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
