"use client";

import { Button } from "@/components/ui/button";
import { Plus, Upload } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddMemberDialog } from "./AddMemberDialog";
import { BulkUploadDialog } from "@/components/members/BulkUploadDialog";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/mongodb/client";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/use-admin";
import { useRouter } from "next/navigation";
import { MembersTable } from "@/components/members/MembersTable";
import { PendingApprovalsTable } from "@/components/members/PendingApprovalsTable";
import { ActiveMembersTable } from "@/components/members/ActiveMembersTable";
import { DeceasedMembersTable } from "@/components/members/DeceasedMembersTable";
import { useGetMemberQuery } from "@/store/slices/memberSlice/api.member";

export default function Members() {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);

  const {data, isLoading} = useGetMemberQuery();
  console.log(data, "data member");
  const [members, setMembers] = useState<any[]>([]);
  const [receivables, setReceivables] = useState<Record<string, { amount: number; status: string }>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { isAdmin } = useAdmin();
  const router = useRouter();

  const fetchMembers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("members")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch members"
      });
    } else {
      setMembers(data || []);
      await fetchReceivables(data || []);
    }
    setLoading(false);
  };

  const fetchReceivables = async (membersList: any[]) => {
    const receivablesMap: Record<string, { amount: number; status: string }> = {};

    for (const member of membersList) {
      try {
        const { data } = await supabase.rpc("get_member_financial_summary", {
          p_member_id: member.id,
        });

        if (data && data.length > 0) {
          receivablesMap[member.id] = {
            amount: Number(data[0].grand_total_due) || 0,
            status: data[0].payment_status || "cleared",
          };
        } else {
          receivablesMap[member.id] = { amount: 0, status: "cleared" };
        }
      } catch {
        receivablesMap[member.id] = { amount: 0, status: "cleared" };
      }
    }

    setReceivables(receivablesMap);
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleApprove = async (memberId: string) => {
    try {
      const { error } = await supabase.rpc("approve_member", { p_member_id: memberId });
      if (error) throw error;

      toast({
        title: "Success",
        description: "Member approved and Beneficiary ID generated"
      });
      fetchMembers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to approve member"
      });
    }
  };

  const handleReject = async (memberId: string) => {
    try {
      const { error } = await supabase.rpc("reject_member", { p_member_id: memberId });
      if (error) throw error;

      toast({
        title: "Success",
        description: "Member rejected"
      });
      fetchMembers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to reject member"
      });
    }
  };

  const handleStatusChange = async (memberId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === "deceased") {
        updateData.deceased_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("members")
        .update(updateData)
        .eq("id", memberId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Member status updated to ${newStatus}`
      });
      fetchMembers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update member status"
      });
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Member Management</h2>
            <p className="text-muted-foreground mt-1">
              Manage all trust members and their information
            </p>
          </div>
          <div className="flex gap-2">
            {isAdmin ? (
              <>
                <Button variant="outline" className="gap-2" onClick={() => setBulkUploadOpen(true)}>
                  <Upload className="h-4 w-4" />
                  Bulk Upload
                </Button>
                <Button className="gap-2" onClick={() => setAddDialogOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add Member
                </Button>
              </>
            ) : (
              <Button variant="outline" className="gap-2" onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                Add Member
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Members</TabsTrigger>
            <TabsTrigger value="pending">Pending Approval</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="deceased">Deceased</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <MembersTable
              members={members}
              receivables={receivables}
              loading={loading}
              isAdmin={isAdmin}
              onMemberClick={(memberId) => router.push(`/members/${memberId}`)}
              onFinancialReportClick={(memberId) => router.push(`/members/${memberId}/financial-report`)}
              onAddMember={() => setAddDialogOpen(true)}
              onBulkUpload={() => setBulkUploadOpen(true)}
              onApprove={handleApprove}
              onReject={handleReject}
              onStatusChange={handleStatusChange}
            />
          </TabsContent>

          <TabsContent value="pending">
            <PendingApprovalsTable
              members={members}
              isAdmin={isAdmin}
              onMemberClick={(memberId) => router.push(`/members/${memberId}`)}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          </TabsContent>

          <TabsContent value="active">
            <ActiveMembersTable
              members={members}
              receivables={receivables}
              isAdmin={isAdmin}
              onMemberClick={(memberId) => router.push(`/members/${memberId}`)}
              onFinancialReportClick={(memberId) => router.push(`/members/${memberId}/financial-report`)}
              onStatusChange={handleStatusChange}
            />
          </TabsContent>

          <TabsContent value="deceased">
            <DeceasedMembersTable
              members={members}
              isAdmin={isAdmin}
              onMemberClick={(memberId) => router.push(`/members/${memberId}`)}
              onStatusChange={handleStatusChange}
            />
          </TabsContent>
        </Tabs>
      </div>
      <AddMemberDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={fetchMembers}
      />
      <BulkUploadDialog
        open={bulkUploadOpen}
        onOpenChange={setBulkUploadOpen}
        onSuccess={fetchMembers}
      />
    </>
  );
}
