import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";
import { DonationStatusBadge } from "@/components/members/PaymentStatusBadge";

interface FinesTableProps {
  fines: any[];
  isAdmin: boolean;
  onPayClick: (type: "fine", record: any) => void;
}

export function FinesTable({ fines, isAdmin, onPayClick }: FinesTableProps) {
  if (fines.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No fine records found
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Reason</TableHead>
          <TableHead>Applied Date</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Paid</TableHead>
          <TableHead>Status</TableHead>
          {isAdmin && <TableHead>Action</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {fines.map((fine) => (
          <TableRow key={fine.id}>
            <TableCell className="font-medium">{fine.reason}</TableCell>
            <TableCell>
              {fine.applied_date ? new Date(fine.applied_date).toLocaleDateString() : "N/A"}
            </TableCell>
            <TableCell className="text-red-600">৳{Number(fine.fine_amount).toFixed(2)}</TableCell>
            <TableCell>৳{Number(fine.paid_amount).toFixed(2)}</TableCell>
            <TableCell>
              <DonationStatusBadge status={fine.status} />
            </TableCell>
            {isAdmin && (
              <TableCell>
                {fine.status !== "paid" && fine.status !== "waived" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onPayClick("fine", fine)}
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
