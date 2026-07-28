"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/mongodb/client";
import { toast } from "sonner";
import { ArrowLeft, Download } from "lucide-react";
import { format } from "date-fns";

interface Member {
  id: string;
  full_name: string;
  beneficiary_id: string;
  member_type: string;
  share_quantity: number;
}

interface ShareTransaction {
  id: string;
  transaction_type: string;
  share_quantity: number;
  amount: number;
  transaction_date: string;
  notes: string | null;
}

interface MonthlyDonation {
  id: string;
  month: number;
  year: number;
  amount: number;
  paid_amount: number;
  status: string;
  due_date: string | null;
  payment_date: string | null;
}

export default function MemberFinancialReport() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<Member | null>(null);
  const [shareTransactions, setShareTransactions] = useState<ShareTransaction[]>([]);
  const [donations, setDonations] = useState<MonthlyDonation[]>([]);
  const [summary, setSummary] = useState({
    totalShares: 0,
    totalShareValue: 0,
    totalDonations: 0,
    totalPaid: 0,
    totalReceivables: 0,
  });

  useEffect(() => {
    if (id) {
      fetchMemberData();
    }
  }, [id]);

  const fetchMemberData = async () => {
    try {
      setLoading(true);

      // Fetch member details
      const { data: memberData, error: memberError } = await supabase
        .from("members")
        .select("id, full_name, beneficiary_id, member_type, share_quantity")
        .eq("id", id)
        .single();

      if (memberError) throw memberError;
      setMember(memberData);

      // Fetch share transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from("share_transactions")
        .select("*")
        .or(`member_id.eq.${id},transfer_from_member_id.eq.${id},transfer_to_member_id.eq.${id}`)
        .order("transaction_date", { ascending: false });

      if (transactionsError) throw transactionsError;
      setShareTransactions(transactionsData || []);

      // Fetch monthly donations
      const { data: donationsData, error: donationsError } = await supabase
        .from("monthly_donations")
        .select("*")
        .eq("member_id", id)
        .order("year", { ascending: false })
        .order("month", { ascending: false });

      if (donationsError) throw donationsError;
      setDonations(donationsData || []);

      // Calculate summary
      const shareValue = (transactionsData || []).reduce(
        (sum, t) => sum + (Number(t.amount) || 0),
        0
      );
      const totalDonations = (donationsData || []).reduce(
        (sum, d) => sum + (Number(d.amount) || 0),
        0
      );
      const totalPaid = (donationsData || []).reduce(
        (sum, d) => sum + (Number(d.paid_amount) || 0),
        0
      );

      setSummary({
        totalShares: memberData?.share_quantity || 0,
        totalShareValue: shareValue,
        totalDonations,
        totalPaid,
        totalReceivables: totalDonations - totalPaid,
      });
    } catch (error: any) {
      console.error("Error fetching member data:", error);
      toast.error("Failed to load member data");
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!member) return;

    let csv = `Member Financial Report\n`;
    csv += `Name: ${member.full_name}\n`;
    csv += `Beneficiary ID: ${member.beneficiary_id}\n`;
    csv += `Member Type: ${member.member_type}\n\n`;

    csv += `Financial Summary\n`;
    csv += `Total Shares,${summary.totalShares}\n`;
    csv += `Total Share Value,৳${summary.totalShareValue.toFixed(2)}\n`;
    csv += `Total Donations,৳${summary.totalDonations.toFixed(2)}\n`;
    csv += `Total Paid,৳${summary.totalPaid.toFixed(2)}\n`;
    csv += `Total Receivables,৳${summary.totalReceivables.toFixed(2)}\n\n`;

    csv += `Share Transactions\n`;
    csv += `Date,Type,Shares,Amount,Notes\n`;
    shareTransactions.forEach((t) => {
      csv += `${format(new Date(t.transaction_date), "yyyy-MM-dd")},${t.transaction_type},${t.share_quantity},৳${Number(t.amount).toFixed(2)},${t.notes || ""}\n`;
    });

    csv += `\nMonthly Donations\n`;
    csv += `Month,Year,Amount,Paid,Status,Due Date\n`;
    donations.forEach((d) => {
      const monthName = format(new Date(d.year, d.month - 1), "MMMM");
      csv += `${monthName},${d.year},৳${Number(d.amount).toFixed(2)},৳${Number(d.paid_amount).toFixed(2)},${d.status},${d.due_date ? format(new Date(d.due_date), "yyyy-MM-dd") : "N/A"}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${member.beneficiary_id}_financial_report.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Report exported successfully");
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      paid: "default",
      partial: "secondary",
      pending: "secondary",
      overdue: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading financial report...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!member) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Member not found</p>
          <Button onClick={() => router.push("/members")} className="mt-4">
            Back to Members
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/members")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h2 className="text-3xl font-bold text-foreground">
                Financial Report
              </h2>
              <p className="text-muted-foreground mt-1">
                {member.full_name} ({member.beneficiary_id})
              </p>
            </div>
          </div>
          <Button onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export to CSV
          </Button>
        </div>

        {/* Financial Summary */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Shares
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalShares}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Share Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ৳{summary.totalShareValue.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Donations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ৳{summary.totalDonations.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Paid
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ৳{summary.totalPaid.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Receivables
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                ৳{summary.totalReceivables.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Share Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Share Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {shareTransactions.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No share transactions found
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Shares</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shareTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {format(new Date(transaction.transaction_date), "PPp")}
                      </TableCell>
                      <TableCell className="capitalize">
                        {transaction.transaction_type}
                      </TableCell>
                      <TableCell>{transaction.share_quantity}</TableCell>
                      <TableCell>৳{Number(transaction.amount).toFixed(2)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {transaction.notes || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Monthly Donations */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Donations</CardTitle>
          </CardHeader>
          <CardContent>
            {donations.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No monthly donations found
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {donations.map((donation) => {
                    const due = Number(donation.amount) - Number(donation.paid_amount);
                    return (
                      <TableRow key={donation.id}>
                        <TableCell>
                          {format(new Date(donation.year, donation.month - 1), "MMMM yyyy")}
                        </TableCell>
                        <TableCell>৳{Number(donation.amount).toFixed(2)}</TableCell>
                        <TableCell className="text-green-600">
                          ৳{Number(donation.paid_amount).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-red-600">
                          ৳{due.toFixed(2)}
                        </TableCell>
                        <TableCell>{getStatusBadge(donation.status)}</TableCell>
                        <TableCell>
                          {donation.due_date
                            ? format(new Date(donation.due_date), "PP")
                            : "N/A"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

