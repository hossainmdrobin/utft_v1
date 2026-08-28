import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type FilterStatus = "ALL" | "PAID" | "DUE" | "OVERDUE" | "UPCOMING";

type InstallmentHistoryCardProps = {
  filter: FilterStatus;
  onFilterChange: (status: FilterStatus) => void;
  installmentData?: {
    data?: Array<{
      _id: string;
      created_at?: string;
      month?: number;
      year?: number;
      amount?: number;
      status?: string;
    }>;
  };
  currency: (amount: number) => string;
  monthArray: string[];
  getStatusBadgeVariant: (status: string) => "default" | "secondary" | "destructive" | "outline";
};

function formatTableDate(dateString?: string) {
  if (!dateString) return "N/A";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "N/A";

  return new Intl.DateTimeFormat("en-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function InstallmentHistoryCard({
  filter,
  onFilterChange,
  installmentData,
  currency,
  monthArray,
  getStatusBadgeVariant,
}: InstallmentHistoryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Installment history</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {(["ALL", "PAID", "DUE", "OVERDUE", "UPCOMING"] as const).map((status) => (
            <Button
              key={status}
              variant={filter === status ? "default" : "outline"}
              size="sm"
              onClick={() => onFilterChange(status)}
            >
              {status}
            </Button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="pb-3 pr-4 font-medium">Paid At</th>
                <th className="pb-3 pr-4 font-medium">Month</th>
                <th className="pb-3 pr-4 font-medium">Amount</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {installmentData?.data?.map((installment) => {
                return (
                  <tr key={installment._id} className="border-b last:border-0">
                    <td className="py-3 pr-4">{formatTableDate(installment.created_at)}</td>
                    <td className="py-3 pr-4">{monthArray[installment.month ?? 0] + " " + (installment.year ?? "")}</td>
                    <td className="py-3 pr-4">{currency(Number(installment.amount ?? 0))}</td>
                    <td className="py-3">
                      <Badge variant={getStatusBadgeVariant(installment?.status ?? "")}>{installment?.status}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
