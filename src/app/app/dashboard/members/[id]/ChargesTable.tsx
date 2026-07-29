import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";
import { DonationStatusBadge } from "@/components/members/PaymentStatusBadge";

interface ChargesTableProps {
  charges: any[];
  isAdmin: boolean;
  onPayClick: (type: "charge", record: any) => void;
}

export function ChargesTable({ charges, isAdmin, onPayClick }: ChargesTableProps) {
  if (charges.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No charge records found
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Year</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Paid</TableHead>
          <TableHead>Status</TableHead>
          {isAdmin && <TableHead>Action</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {charges.map((charge) => (
          <TableRow key={charge.id}>
            <TableCell className="font-medium capitalize">
              {charge.charge_type?.replace(/_/g, " ")}
            </TableCell>
            <TableCell>{charge.description || "N/A"}</TableCell>
            <TableCell>{charge.year}</TableCell>
            <TableCell>৳{Number(charge.amount).toFixed(2)}</TableCell>
            <TableCell>৳{Number(charge.paid_amount).toFixed(2)}</TableCell>
            <TableCell>
              <DonationStatusBadge status={charge.status} />
            </TableCell>
            {isAdmin && (
              <TableCell>
                {charge.status !== "paid" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onPayClick("charge", charge)}
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
