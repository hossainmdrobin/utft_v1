'use client'
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Upload, RotateCcw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddMemberDialog } from "./AddMemberDialog";
import { BulkUploadDialog } from "@/components/members/BulkUploadDialog";
import { supabase } from "@/integrations/mongodb/client";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/use-admin";
import { useRouter } from "next/navigation";
import { MembersTable } from "@/components/members/MembersTable";
import { PendingApprovalsTable } from "@/components/members/PendingApprovalsTable";
import { ActiveMembersTable } from "@/components/members/ActiveMembersTable";
import { DeceasedMembersTable } from "@/components/members/DeceasedMembersTable";
import { useGetMembersQuery } from "@/store/slices/memberSlice/api.member";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { MemberDoc } from "@/models/member";

type MemberDisplay = MemberDoc & { id: string };

export default function Members() {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [filters, setFilters] = useState<{
    stage?: string;
    joinDateFrom?: string;
    joinDateTo?: string;
    user_id?: string;
    role?: string;
    member_type?: string;
    search?: string;
  }>({});
  const [memberList, setMemberList] = useState<MemberDisplay[]>([]);
  const [receivables, setReceivables] = useState<Record<string, { amount: number; status: string }>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { isAdmin } = useAdmin();
  const router = useRouter();

  const { data, isLoading } = useGetMembersQuery(Object.keys(filters).length > 0 ? filters : undefined);

  useEffect(() => {
    const mapped: MemberDisplay[] = (data?.data || []).map((member) => ({
      ...member,
      id: member._id || member.id,
      status: member.stage || member.status,
      beneficiary_id: member.user_id || member.beneficiary_id,
    }));
    setMemberList(mapped);
  }, [data]);

  const fetchReceivables = async (membersList: MemberDisplay[]) => {
    const receivablesMap: Record<string, { amount: number; status: string }> = {};

    for (const member of membersList) {
      try {
        const { data: financialData } = await supabase.rpc("get_member_financial_summary", {
          p_member_id: member.id,
        });

        if (financialData && financialData.length > 0) {
          receivablesMap[member.id] = {
            amount: Number(financialData[0].grand_total_due) || 0,
            status: financialData[0].payment_status || "cleared",
          };
        } else {
          receivablesMap[member.id] = { amount: 0, status: "cleared" };
        }
      } catch {
        receivablesMap[member.id] = { amount: 0, status: "cleared" };
      }
    }

    setReceivables(receivablesMap);
    setLoading(false);
  };

  useEffect(() => {
    if (memberList.length > 0) {
      fetchReceivables(memberList);
    } else {
      setLoading(false);
    }
  }, [memberList]);

  const handleApprove = async (memberId: string) => {
    try {
      const { error } = await supabase.rpc("approve_member", { p_member_id: memberId });
      if (error) throw error;

      toast({
        title: "Success",
        description: "Member approved and Beneficiary ID generated"
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to approve member";
      toast({
        variant: "destructive",
        title: "Error",
        description: message
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
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to reject member";
      toast({
        variant: "destructive",
        title: "Error",
        description: message
      });
    }
  };

  const handleStatusChange = async (memberId: string, newStatus: string) => {
    const updateData: Record<string, string | Date> = { status: newStatus };
    try {
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
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update member status";
      toast({
        variant: "destructive",
        title: "Error",
        description: message
      });
    }
  };

  const updateFilter = (key: string, value: string) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (value) {
        next[key] = value;
      } else {
        delete next[key];
      }
      return next;
    });
  };

  const resetFilters = () => {
    setFilters({});
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

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

        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px] max-w-[300px]">
            <Label className="text-xs text-muted-foreground mb-1 block">Search</Label>
            <Input
              placeholder="Name, NID, mobile..."
              value={filters.search || ""}
              onChange={(e) => updateFilter("search", e.target.value)}
            />
          </div>
          <div className="min-w-[150px]">
            <Label className="text-xs text-muted-foreground mb-1 block">Stage</Label>
            <Select
              value={filters.stage}
              onValueChange={(v) => updateFilter("stage", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="initiated">Initiated</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[150px]">
            <Label className="text-xs text-muted-foreground mb-1 block">Role</Label>
            <Select
              value={filters.role}
              onValueChange={(v) => updateFilter("role", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="president">President</SelectItem>
                <SelectItem value="director">Director</SelectItem>
                <SelectItem value="accountant">Accountant</SelectItem>
                <SelectItem value="auditor">Auditor</SelectItem>
                <SelectItem value="member">Member</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[150px]">
            <Label className="text-xs text-muted-foreground mb-1 block">Member Type</Label>
            <Select
              value={filters.member_type}
              onValueChange={(v) => updateFilter("member_type", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="founding">Founding</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[140px]">
            <Label className="text-xs text-muted-foreground mb-1 block">Join Date From</Label>
            <Input
              type="date"
              value={filters.joinDateFrom || ""}
              onChange={(e) => updateFilter("joinDateFrom", e.target.value)}
            />
          </div>
          <div className="min-w-[140px]">
            <Label className="text-xs text-muted-foreground mb-1 block">Join Date To</Label>
            <Input
              type="date"
              value={filters.joinDateTo || ""}
              onChange={(e) => updateFilter("joinDateTo", e.target.value)}
            />
          </div>
          <div className="min-w-[150px]">
            <Label className="text-xs text-muted-foreground mb-1 block">User ID</Label>
            <Input
              placeholder="Filter by user ID"
              value={filters.user_id || ""}
              onChange={(e) => updateFilter("user_id", e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" onClick={resetFilters}>
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset Filters
            </Button>
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
              members={memberList}
              receivables={receivables}
              loading={loading || isLoading}
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
              members={memberList}
              isAdmin={isAdmin}
              onMemberClick={(memberId) => router.push(`/members/${memberId}`)}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          </TabsContent>

          <TabsContent value="active">
            <ActiveMembersTable
              members={memberList}
              receivables={receivables}
              isAdmin={isAdmin}
              onMemberClick={(memberId) => router.push(`/members/${memberId}`)}
              onFinancialReportClick={(memberId) => router.push(`/members/${memberId}/financial-report`)}
              onStatusChange={handleStatusChange}
            />
          </TabsContent>

          <TabsContent value="deceased">
            <DeceasedMembersTable
              members={memberList}
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
        onSuccess={() => {}}
      />
      <BulkUploadDialog
        open={bulkUploadOpen}
        onOpenChange={setBulkUploadOpen}
        onSuccess={() => {}}
      />
    </>
  );
}