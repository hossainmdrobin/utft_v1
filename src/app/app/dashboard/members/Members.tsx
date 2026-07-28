'use client'
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Upload } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddMemberDialog } from "./AddMemberDialog";
import { BulkUploadDialog } from "@/components/members/BulkUploadDialog";
import { supabase } from "@/integrations/mongodb/client";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/use-admin";
import { useRouter } from "next/navigation";
import { MembersTable } from "@/components/members/MembersTable";
import { useGetMembersQuery } from "@/store/slices/memberSlice/api.member";
import type { MemberDoc } from "@/models/member";
import MemberFilter from "./MemberFilter";

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

        <MemberFilter filters={filters} setFilters={setFilters} />

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Members</TabsTrigger>
            <TabsTrigger value="pending">Pending Approval</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="deceased">Deceased</TabsTrigger>
          </TabsList>

          {data && <TabsContent value="all" className="space-y-4">
            <MembersTable
              members={data.data}
              receivables={receivables}
              loading={loading || isLoading}
              isAdmin={isAdmin}
              onMemberClick={(memberId) => router.push(`/members/${memberId}`)}
              onFinancialReportClick={(memberId) => router.push(`/members/${memberId}/financial-report`)}
              onAddMember={() => setAddDialogOpen(true)}
              onBulkUpload={() => setBulkUploadOpen(true)}
              // onApprove={handleApprove}
              // onReject={handleReject}
              // onStatusChange={handleStatusChange}
            />
          </TabsContent>}

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