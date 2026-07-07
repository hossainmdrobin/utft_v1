import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MemberFinancialSummary {
  total_contributions: number;
  total_paid: number;
  total_due: number;
  total_fines: number;
  fines_paid: number;
  fines_pending: number;
  total_charges: number;
  charges_paid: number;
  charges_due: number;
  grand_total_due: number;
  payment_status: "cleared" | "due" | "overdue" | "fine_applied";
}

export interface MemberWithFinancials {
  id: string;
  full_name: string;
  beneficiary_id: string | null;
  member_type: string;
  status: string;
  mobile: string | null;
  share_quantity: number;
  financials?: MemberFinancialSummary;
}

export function useMemberFinancials(memberId?: string) {
  const [summary, setSummary] = useState<MemberFinancialSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    if (!memberId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.rpc("get_member_financial_summary", {
        p_member_id: memberId,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setSummary({
          total_contributions: Number(data[0].total_contributions) || 0,
          total_paid: Number(data[0].total_paid) || 0,
          total_due: Number(data[0].total_due) || 0,
          total_fines: Number(data[0].total_fines) || 0,
          fines_paid: Number(data[0].fines_paid) || 0,
          fines_pending: Number(data[0].fines_pending) || 0,
          total_charges: Number(data[0].total_charges) || 0,
          charges_paid: Number(data[0].charges_paid) || 0,
          charges_due: Number(data[0].charges_due) || 0,
          grand_total_due: Number(data[0].grand_total_due) || 0,
          payment_status: data[0].payment_status as MemberFinancialSummary["payment_status"],
        });
      }
    } catch (err: any) {
      console.error("Error fetching member financial summary:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Set up realtime subscription
  useEffect(() => {
    if (!memberId) return;

    const channel = supabase
      .channel(`member-financials-${memberId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "monthly_donations",
          filter: `member_id=eq.${memberId}`,
        },
        () => fetchSummary()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "fine_transactions",
          filter: `member_id=eq.${memberId}`,
        },
        () => fetchSummary()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "member_charges",
          filter: `member_id=eq.${memberId}`,
        },
        () => fetchSummary()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [memberId, fetchSummary]);

  return { summary, loading, error, refetch: fetchSummary };
}

// Hook for fetching all members with their financial status
export function useAllMembersFinancials() {
  const [members, setMembers] = useState<MemberWithFinancials[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllMembersFinancials = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch members
      const { data: membersData, error: membersError } = await supabase
        .from("members")
        .select("id, full_name, beneficiary_id, member_type, status, mobile, share_quantity")
        .order("created_at", { ascending: false });

      if (membersError) throw membersError;

      // Fetch financial summary for each member
      const membersWithFinancials: MemberWithFinancials[] = await Promise.all(
        (membersData || []).map(async (member) => {
          try {
            const { data } = await supabase.rpc("get_member_financial_summary", {
              p_member_id: member.id,
            });

            return {
              ...member,
              financials: data && data.length > 0 ? {
                total_contributions: Number(data[0].total_contributions) || 0,
                total_paid: Number(data[0].total_paid) || 0,
                total_due: Number(data[0].total_due) || 0,
                total_fines: Number(data[0].total_fines) || 0,
                fines_paid: Number(data[0].fines_paid) || 0,
                fines_pending: Number(data[0].fines_pending) || 0,
                total_charges: Number(data[0].total_charges) || 0,
                charges_paid: Number(data[0].charges_paid) || 0,
                charges_due: Number(data[0].charges_due) || 0,
                grand_total_due: Number(data[0].grand_total_due) || 0,
                payment_status: data[0].payment_status as MemberFinancialSummary["payment_status"],
              } : undefined,
            };
          } catch {
            return { ...member, financials: undefined };
          }
        })
      );

      setMembers(membersWithFinancials);
    } catch (err: any) {
      console.error("Error fetching members with financials:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllMembersFinancials();
  }, [fetchAllMembersFinancials]);

  // Set up realtime subscription for any donation/fine changes
  useEffect(() => {
    const channel = supabase
      .channel("all-members-financials")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "monthly_donations" },
        () => fetchAllMembersFinancials()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fine_transactions" },
        () => fetchAllMembersFinancials()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "member_charges" },
        () => fetchAllMembersFinancials()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAllMembersFinancials]);

  return { members, loading, error, refetch: fetchAllMembersFinancials };
}

// Calculate fines function to trigger manual fine calculation
export async function triggerFineCalculation() {
  const { error } = await supabase.rpc("calculate_member_fines");
  if (error) {
    console.error("Error calculating fines:", error);
    throw error;
  }
}
