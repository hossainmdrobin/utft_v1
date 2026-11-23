'use client'
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { AddMemberDialog } from "./AddMemberDialog";
import { MembersTable } from "@/components/members/MembersTable";
import { useGetMembersQuery } from "@/store/slices/memberSlice/api.member";
import { useGetSettingsQuery } from "@/store/slices/settingSlice/api.setting";
import {
  useGetInstallmentsQuery,
  type Installment,
} from "@/store/slices/paymentSlice/api.slice";
import type { MemberDoc } from "@/models/member";
import MemberFilter from "./MemberFilter";
import { useGetCurrentUserQuery } from "@/store/slices/authSlice/api.auth";
import { Skeleton } from "@/components/ui/skeleton";

type MemberDisplay = MemberDoc & { id: string };

function isInstallmentPaid(item: Installment): boolean {
  return (
    item.payment_status === "paid" ||
    String(item.status || "").toLowerCase() === "paid" ||
    Boolean(item.transaction_id)
  );
}

function normalizeMemberId(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "object") {
    const id = (value as { _id?: unknown })._id;
    return id === null || id === undefined ? undefined : String(id);
  }
  return String(value);
}

export default function Members() {
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const [filters, setFilters] = useState<{
    stage?: string;
    user_id?: string;
    role?: string;
    member_type?: string;
    search?: string;
  }>({});
  const { data: currentMember } = useGetCurrentUserQuery()
  const isAdmin = ['admin', 'director', 'president']?.includes(currentMember?.role)
  const { data, isLoading: membersLoading } = useGetMembersQuery(Object.keys(filters).length > 0 ? filters : undefined);
  const {
    data: settingsData,
    isLoading: settingsLoading,
    isError: settingsError,
  } = useGetSettingsQuery();
  const {
    data: installmentData,
    isLoading: installmentsLoading,
    isError: installmentsError,
  } = useGetInstallmentsQuery();

  const unpaidCountByMember = useMemo(() => {
    const map = new Map<string, number>();
    const installments = installmentData?.data ?? [];
    for (const installment of installments) {
      if (isInstallmentPaid(installment)) continue;
      const memberId = normalizeMemberId(installment.member);
      if (!memberId) continue;
      map.set(memberId, (map.get(memberId) ?? 0) + 1);
    }
    return map;
  }, [installmentData]);

  const shareValue = Number(settingsData?.data?.share_value) || 0;
  const currencySymbol = settingsData?.data?.currency_symbol || "৳";
  const currencyDecimalPlaces = Number.isFinite(Number(settingsData?.data?.currency_decimal_places))
    ? Number(settingsData?.data?.currency_decimal_places)
    : 2;
  const currencyPosition = settingsData?.data?.currency_position || "before";

  const isLoading = membersLoading || settingsLoading || installmentsLoading;

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
                {/* <Button variant="outline" className="gap-2" onClick={() => setBulkUploadOpen(true)}>
                  <Upload className="h-4 w-4" />
                  Bulk Upload
                </Button> */}
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


          {isLoading ? (
            <TabsContent value="all" className="space-y-4">
              <div className="space-y-4">
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-10 w-1/2" />
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-10" />
                  ))}
                </div>
                <Skeleton className="h-[400px] w-full" />
              </div>
            </TabsContent>
          ) : (
            <TabsContent value="all" className="space-y-4">
              <MembersTable
                members={data?.data}
                loading={isLoading}
                unpaidCountByMember={unpaidCountByMember}
                installmentsUnavailable={installmentsError}
                settingsUnavailable={settingsError}
                shareValue={shareValue}
                currencySymbol={currencySymbol}
                currencyDecimalPlaces={currencyDecimalPlaces}
                currencyPosition={currencyPosition}
                isAdmin={isAdmin}
                onAddMember={() => setAddDialogOpen(true)}
              />
            </TabsContent>
          )}
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