import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";
import { DonationStatusBadge } from "@/components/members/PaymentStatusBadge";

interface DonationsTableProps {
  donations: any[];
  isAdmin: boolean;
  onPayClick: (type: "donation", record: any) => void;
  formatMonthYear: (year: number, month: number) => string;
}

export function DonationsTable({ donations, isAdmin, onPayClick, formatMonthYear }: DonationsTableProps) {
  if (donations.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No share payment records found
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Period</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Paid</TableHead>
          <TableHead>Due Date</TableHead>
          <TableHead>Status</TableHead>
          {isAdmin && <TableHead>Action</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {donations.map((donation) => (
          <TableRow key={donation.id}>
            <TableCell className="font-medium">
              {formatMonthYear(donation.year, donation.month)}
            </TableCell>
            <TableCell>৳{Number(donation.amount).toFixed(2)}</TableCell>
            <TableCell>৳{Number(donation.paid_amount).toFixed(2)}</TableCell>
            <TableCell>
              {donation.due_date ? new Date(donation.due_date).toLocaleDateString() : "N/A"}
            </TableCell>
            <TableCell>
              <DonationStatusBadge status={donation.status} />
            </TableCell>
            {isAdmin && (
              <TableCell>
                {donation.status !== "paid" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onPayClick("donation", donation)}
                  >
                    <CreditCard className="h-3 w-3 mr-1" />
                    Pay
                  </Button>
                )}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
