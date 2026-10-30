import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getInstallmentStatus, type InstallmentRecord } from "./installment-logic";

export type FilterStatus = "ALL" | "PAID" | "DUE" | "OVERDUE" | "UPCOMING";

type InstallmentHistoryCardProps = {
  filter: FilterStatus;
  onFilterChange: (status: FilterStatus) => void;
  records?: InstallmentRecord[];
  currency: (amount: number) => string;
  monthArray: string[];
  getStatusBadgeVariant: (status: string) => "default" | "secondary" | "destructive" | "outline";
  currentDate?: Date;
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
  records,
  currency,
  monthArray,
  getStatusBadgeVariant,
  currentDate = new Date(),
}: InstallmentHistoryCardProps) {
  const filteredRecords = (records ?? []).filter((record) => {
    if (filter === "ALL") return true;
    const status = record.status === "PAID" ? "PAID" : getInstallmentStatus(record, currentDate);
    const normalized = status === "DUE_SOON" ? "DUE" : status;
    return normalized === filter;
  });

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
              {filteredRecords.map((record) => {
                const [yearStr, monthStr] = record.period.split("-");
                const monthIndex = Number(monthStr) - 1;
                const displayStatus = record.status === "PAID" ? "PAID" : getInstallmentStatus(record, currentDate);
                const normalizedStatus = displayStatus === "DUE_SOON" ? "DUE" : displayStatus;
                return (
                  <tr key={record.id} className="border-b last:border-0">
                    <td className="py-3 pr-4">{formatTableDate(record.paidAt ?? record.updatedAt)}</td>
                    <td className="py-3 pr-4">{monthArray[monthIndex] ?? monthStr} {yearStr}</td>
                    <td className="py-3 pr-4">{currency(Number(record.amount ?? 0))}</td>
                    <td className="py-3">
                      <Badge variant={getStatusBadgeVariant(normalizedStatus)}>{normalizedStatus}</Badge>
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
