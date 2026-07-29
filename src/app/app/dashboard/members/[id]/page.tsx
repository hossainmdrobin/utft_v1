"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import SignupForm from "@/app/auth/SignupForm";
import { RecordPaymentDialog } from "@/components/members/RecordPaymentDialog";
import { useAdmin } from "@/hooks/use-admin";
import { useMemberFinancials } from "@/hooks/use-member-financials";
import { useQuery } from "@tanstack/react-query";
import { useGetMemberByIdQuery } from "@/store/slices/memberSlice/api.member";
import { supabase } from "@/integrations/mongodb/client";
import ProfilePage from "@/app/app/dashboard/profile/page";
import { MemberHeader } from "./MemberHeader";
import { FinancialSummaryCard } from "./FinancialSummaryCard";
import { FinancialHistoryTabs } from "./FinancialHistoryTabs";

export default function Page() {
  const params = useParams();
  const id = params.id as string;
  const { data, isLoading, error } = useGetMemberByIdQuery(id);
  const member = data?.data;
  const router = useRouter();
  const { toast } = useToast();
  const { isAdmin } = useAdmin();
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentRecord, setPaymentRecord] = useState<{
    type: "donation" | "charge" | "fine";
    record: any;
  } | null>(null);

  const [donations, setDonations] = useState<any[]>([]);
  const [fines, setFines] = useState<any[]>([]);
  const [charges, setCharges] = useState<any[]>([]);

  const { summary: financialSummary, loading: financialLoading, refetch: refetchSummary } = useMemberFinancials(id);

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

    const { data: donationsData } = await supabase
      .from("monthly_donations")
      .select("*")
      .eq("member_id", id)
      .order("year", { ascending: false })
      .order("month", { ascending: false });
    setDonations(donationsData || []);

    const { data: finesData } = await supabase
      .from("fine_transactions")
      .select("*")
      .eq("member_id", id)
      .order("applied_date", { ascending: false });
    setFines(finesData || []);

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
        <MemberHeader memberId={id} isAdmin={isAdmin} onEditClick={() => setEditDialogOpen(true)} />
        <ProfilePage memberProp={member} />
        <FinancialSummaryCard
          financialSummary={financialSummary}
          financialLoading={financialLoading}
        />
        <FinancialHistoryTabs
          memberId={id}
          isAdmin={isAdmin}
          donations={donations}
          charges={charges}
          fines={fines}
          shareReceivablesCount={shareReceivablesCount}
          onPayClick={openPaymentDialog}
          formatMonthYear={formatMonthYear}
        />
      </div>

      <SignupForm
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={() => {}}
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
