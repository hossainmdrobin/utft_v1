import { Plus, Users as UsersIcon } from "lucide-react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PaymentStatusBadge } from "@/components/members/PaymentStatusBadge";
import { MemberActionMenu } from "@/components/members/MemberActionMenu";
import { useGetCurrentUserQuery } from "@/store/slices/authSlice/api.auth";
import { useUpdateMemberMutation } from "@/store/slices/memberSlice/api.member";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

interface MembersTableProps {
  members: any[];
  receivables: Record<string, { amount: number; status: string }>;
  loading: boolean;
  isAdmin: boolean;
  onAddMember: () => void;
}

export function MembersTable({
  members,
  receivables,
  loading,
  isAdmin,
  onAddMember,
}: MembersTableProps) {
  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      active: "default",
      inactive: "secondary",
      deceased: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };
  const { toast } = useToast()

  const { data, } = useGetCurrentUserQuery()
  const [updateMember, { data: updatedMember, error }] = useUpdateMemberMutation()
  const updateAccess = ["admin", "president", "director"]
  useEffect(() => {
    if (updatedMember) {
      toast({
        title: "Success",
        description: "Member Updated"
      })
    }
    if (error) toast({
      variant: "destructive",
      title: "Error",
      description: error instanceof Error ? error.message : "Failed to create member"
    });
  }, [updatedMember, error])

  const onStatusChange = (id, stage) => {
    updateMember({ id, stage })
  }
  console.log(data, "updated error")
  return (
    <div className="space-y-4">
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Member List ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <UsersIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No members yet
              </h3>
              <p className="text-muted-foreground mb-6 max-w-sm">
                Get started by adding your first member or uploading a CSV/Excel file with member data.
              </p>
              <div className="flex gap-2">
                <Button className="gap-2" onClick={onAddMember}>
                  <Plus className="h-4 w-4" />
                  Add First Member
                </Button>
                <Button variant="outline" className="gap-2">
                  <Upload className="h-4 w-4" />
                  Upload CSV
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Beneficiary ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Member Type</TableHead>
                    <TableHead>Share Qty</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead className="cursor-pointer hover:underline">Receivables</TableHead>
                    {isAdmin && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member._id}>
                      <TableCell
                        className="font-medium cursor-pointer hover:underline"
                      // onClick={() => onMemberClick(member.id)}
                      >
                        {member.beneficiary_id || "Pending"}
                      </TableCell>
                      <TableCell
                        className="cursor-pointer hover:underline"
                      // onClick={() => onMemberClick(member.id)}
                      >
                        {member.full_name}
                      </TableCell>
                      <TableCell
                        className="capitalize cursor-pointer"
                      // onClick={() => onMemberClick(member.id)}
                      >
                        {member.member_type}
                      </TableCell>
                      <TableCell
                        className="cursor-pointer"
                      // onClick={() => onMemberClick(member.id)}
                      >
                        {member.share_quantity}
                      </TableCell>
                      <TableCell
                        className="cursor-pointer"
                      // onClick={() => onMemberClick(member.id)}
                      >
                        {getStatusBadge(member.stage)}
                      </TableCell>
                      <TableCell
                        className="cursor-pointer"
                      // onClick={() => onMemberClick(member.id)}
                      >
                        <PaymentStatusBadge
                          status={receivables[member.id]?.status || "cleared"}
                        />
                      </TableCell>
                      <TableCell
                        className="cursor-pointer"
                      // onClick={() => onMemberClick(member.id)}
                      >
                        {member.mobile}
                      </TableCell>
                      <TableCell
                        className="font-semibold cursor-pointer text-primary hover:underline"
                      // onClick={() => onFinancialReportClick(member.id)}
                      >
                        ৳{(receivables[member.id]?.amount || 0).toFixed(2)}
                      </TableCell>
                      {updateAccess.includes(data?.data.role) && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-2">
                            {member.stage === "pending" ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateMember({ id: member._id, ...{ stage: "approved" } })}
                                >
                                  <Check className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateMember({ id: member._id, ...{ stage: "rejected" } })}
                                >
                                  <X className="h-4 w-4 text-red-600" />
                                </Button>
                              </>
                            ) : (
                              <MemberActionMenu
                                memberId={member._id}
                                status={member.stage}
                                onStatusChange={onStatusChange}
                              />
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
