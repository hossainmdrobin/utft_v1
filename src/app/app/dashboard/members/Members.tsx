'use client'
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Upload } from "lucide-react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
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
import { useGetCurrentUserQuery } from "@/store/slices/authSlice/api.auth";

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
  const { data: currentMember } = useGetCurrentUserQuery()
  const isAdmin = ['admin', 'director', 'president']?.includes(currentMember?.role)
  const [receivables, setReceivables] = useState<Record<string, { amount: number; status: string }>>({});
  const { data, isLoading } = useGetMembersQuery(Object.keys(filters).length > 0 ? filters : undefined);

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


          {data && <TabsContent value="all" className="space-y-4">
            <MembersTable
              members={data.data}
              receivables={receivables}
              loading={isLoading}
              isAdmin={isAdmin}
              onAddMember={() => setAddDialogOpen(true)}
            />
          </TabsContent>}

        </Tabs>
      </div>
      <AddMemberDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />
      {/* <BulkUploadDialog
        open={bulkUploadOpen}
        onOpenChange={setBulkUploadOpen}
      /> */}
    </>
  );
}