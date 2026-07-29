"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Mail, Phone, MapPin, User, FileText, Banknote, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/mongodb/client";
import { useToast } from "@/hooks/use-toast";
import SignupForm from "@/app/auth/SignupForm";
import { RecordPaymentDialog } from "@/components/members/RecordPaymentDialog";
import { useAdmin } from "@/hooks/use-admin";
import { useMemberFinancials } from "@/hooks/use-member-financials";
import { PaymentStatusBadge, DonationStatusBadge } from "@/components/members/PaymentStatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShareReceivablesTab } from "@/components/shares/ShareReceivablesTab";
import { useQuery } from "@tanstack/react-query";
import { useGetMemberByIdQuery } from "@/store/slices/memberSlice/api.member";
import ProfilePage from "@/app/app/dashboard/profile/page";

export default function MemberDetails() {
  const params = useParams();
  const id = params.id as string;
  const { data, isLoading:loading, error } = useGetMemberByIdQuery(id)
  const member = data?.data
  const router = useRouter();
  const { toast } = useToast();
  const { isAdmin } = useAdmin();
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentRecord, setPaymentRecord] = useState<{
    type: "donation" | "charge" | "fine";
    record: any;
  } | null>(null);

  // Financial data
  const [donations, setDonations] = useState<any[]>([]);
  const [fines, setFines] = useState<any[]>([]);
  const [charges, setCharges] = useState<any[]>([]);

  const { summary: financialSummary, loading: financialLoading, refetch: refetchSummary } = useMemberFinancials(id);

  // Fetch share receivables count
  const { data: shareReceivablesCount = 0 } = useQuery({
    queryKey: ["member-share-receivables-count", id],
    queryFn: async () => {
      if (!id) return 0;
      const { count } = await supabase
        .from("share_receivables")
        .select("id", { count: "exact", head: true })
        .eq("member_id", id);
      return count || 0;
    },
    enabled: !!id,
  });

  const fetchFinancialHistory = async () => {
    if (!id) return;

    // Fetch donations
    const { data: donationsData } = await supabase
      .from("monthly_donations")
      .select("*")
      .eq("member_id", id)
      .order("year", { ascending: false })
      .order("month", { ascending: false });
    setDonations(donationsData || []);

    // Fetch fines
    const { data: finesData } = await supabase
      .from("fine_transactions")
      .select("*")
      .eq("member_id", id)
      .order("applied_date", { ascending: false });
    setFines(finesData || []);

    // Fetch charges
    const { data: chargesData } = await supabase
      .from("member_charges")
      .select("*")
      .eq("member_id", id)
      .order("created_at", { ascending: false });
    setCharges(chargesData || []);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      active: "default",
      inactive: "secondary",
      deceased: "destructive"
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const formatMonthYear = (year: number, month: number) => {
    const date = new Date(year, month - 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const openPaymentDialog = (type: "donation" | "charge" | "fine", record: any) => {
    let description = "";
    let period = "";

    if (type === "donation") {
      period = formatMonthYear(record.year, record.month);
      description = "Monthly Contribution";
    } else if (type === "charge") {
      description = record.charge_type?.replace(/_/g, " ") || "Charge";
      period = record.year?.toString() || "";
    } else if (type === "fine") {
      description = record.reason || "Late Payment Fine";
      period = record.applied_date ? new Date(record.applied_date).toLocaleDateString() : "";
    }

    setPaymentRecord({
      type,
      record: {
        id: record.id,
        amount: Number(type === "fine" ? record.fine_amount : record.amount),
        paid_amount: Number(record.paid_amount),
        description,
        period,
      },
    });
    setPaymentDialogOpen(true);
  };

  const handlePaymentSuccess = () => {
    fetchFinancialHistory();
    refetchSummary();
  };

  if (!member) return <div>No member</div>;

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Members
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/members/${id}/financial-report`)}
            >
              <FileText className="h-4 w-4 mr-2" />
              Financial Report
            </Button>
            <Button onClick={() => setEditDialogOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Member
            </Button>
          </div>
        </div>

        {/* Profile Card with Payment Status */}
        <ProfilePage  memberProp={member} />
        

        {/* Financial Summary Card */}
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

        {/* Financial History Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Financial History</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="receivables" className="space-y-4">
              <TabsList className="flex-wrap">
                <TabsTrigger value="receivables">
                  Share Receivables ({shareReceivablesCount})
                </TabsTrigger>
                <TabsTrigger value="shares">
                  Contributions ({donations.length})
                </TabsTrigger>
                <TabsTrigger value="charges">
                  Charges ({charges.length})
                </TabsTrigger>
                <TabsTrigger value="fines">
                  Fines ({fines.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="receivables">
                {id && <ShareReceivablesTab memberId={id} isAdmin={isAdmin} />}
              </TabsContent>

              <TabsContent value="shares">
                {donations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No share payment records found
                  </div>
                ) : (
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
                                  onClick={() => openPaymentDialog("donation", donation)}
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
                )}
              </TabsContent>

              <TabsContent value="charges">
                {charges.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No charge records found
                  </div>
                ) : (
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
                                  onClick={() => openPaymentDialog("charge", charge)}
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
                )}
              </TabsContent>

              <TabsContent value="fines">
                {fines.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No fine records found
                  </div>
                ) : (
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
                                  onClick={() => openPaymentDialog("fine", fine)}
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
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <SignupForm
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={()=>{}}
        editMember={member}
        id={member?.user_id}
      />

      {paymentRecord && (
        <RecordPaymentDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          paymentType={paymentRecord.type}
          record={paymentRecord.record}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </>
  );
}
