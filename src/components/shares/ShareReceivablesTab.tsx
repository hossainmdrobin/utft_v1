import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/mongodb/client";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreditCard } from "lucide-react";
import { useState } from "react";
import { MarkAsPaidDialog } from "./MarkAsPaidDialog";

interface ShareReceivablesTabProps {
  memberId: string;
  isAdmin: boolean;
}

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
  payment_date: string | null;
  due_date: string | null;
}

export function ShareReceivablesTab({ memberId, isAdmin }: ShareReceivablesTabProps) {
  const [selectedReceivable, setSelectedReceivable] = useState<ShareReceivable | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: receivables = [], refetch } = useQuery({
    queryKey: ["member-share-receivables", memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("share_receivables")
        .select("*")
        .eq("member_id", memberId)
        .order("year", { ascending: false })
        .order("month", { ascending: false });
      if (error) throw error;
      return data as ShareReceivable[];
    },
  });

  const { data: member } = useQuery({
    queryKey: ["member-details", memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name, beneficiary_id, share_quantity")
        .eq("id", memberId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const formatMonthYear = (year: number, month: number) => {
    return format(new Date(year, month - 1, 1), "MMMM yyyy");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500 hover:bg-green-600">Paid</Badge>;
      case "partial":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Partial</Badge>;
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const handlePayClick = (receivable: ShareReceivable) => {
    setSelectedReceivable({
      ...receivable,
      member: member
        ? {
            id: member.id,
            full_name: member.full_name,
            beneficiary_id: member.beneficiary_id,
            share_quantity: member.share_quantity,
          }
        : undefined,
    } as any);
    setIsDialogOpen(true);
  };

  if (receivables.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No share receivables found for this member
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Period</TableHead>
            <TableHead className="text-right">Shares</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Paid</TableHead>
            <TableHead className="text-right">Remaining</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Status</TableHead>
            {isAdmin && <TableHead>Action</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {receivables.map((receivable) => {
            const remaining =
              receivable.remaining_amount ??
              Number(receivable.total_amount) - Number(receivable.paid_amount);
            return (
              <TableRow key={receivable.id}>
                <TableCell className="font-medium">
                  {formatMonthYear(receivable.year, receivable.month)}
                </TableCell>
                <TableCell className="text-right">{receivable.share_quantity}</TableCell>
                <TableCell className="text-right">
                  ৳{Number(receivable.total_amount).toLocaleString()}
                </TableCell>
                <TableCell className="text-right text-green-600">
                  ৳{Number(receivable.paid_amount).toLocaleString()}
                </TableCell>
                <TableCell className="text-right text-orange-600">
                  ৳{remaining.toLocaleString()}
                </TableCell>
                <TableCell>
                  {receivable.due_date
                    ? new Date(receivable.due_date).toLocaleDateString()
                    : "N/A"}
                </TableCell>
                <TableCell>{getStatusBadge(receivable.status)}</TableCell>
                {isAdmin && (
                  <TableCell>
                    {receivable.status !== "paid" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePayClick(receivable)}
                      >
                        <CreditCard className="h-3 w-3 mr-1" />
                        Pay
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {selectedReceivable && (
        <MarkAsPaidDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          receivable={selectedReceivable as any}
          onSuccess={() => {
            refetch();
            setSelectedReceivable(null);
          }}
        />
      )}
    </>
  );
}
