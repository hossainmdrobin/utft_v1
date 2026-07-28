import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MemberActionMenu } from "@/components/members/MemberActionMenu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface PendingApprovalsTableProps {
  members: any[];
  isAdmin: boolean;
  onMemberClick: (memberId: string) => void;
  onApprove: (memberId: string) => void;
  onReject: (memberId: string) => void;
}

export function PendingApprovalsTable({
  members,
  isAdmin,
  onMemberClick,
  onApprove,
  onReject,
}: PendingApprovalsTableProps) {
  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle>Pending Approvals ({members.filter((m) => m.status === "pending").length})</CardTitle>
      </CardHeader>
      <CardContent>
        {members.filter((m) => m.status === "pending").length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No pending member approvals
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Member Type</TableHead>
                <TableHead>Share Qty</TableHead>
                <TableHead>Mobile</TableHead>
                {isAdmin && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members
                .filter((m) => m.status === "pending")
                .map((member) => (
                  <TableRow
                    key={member.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onMemberClick(member.id)}
                  >
                    <TableCell>{member.full_name}</TableCell>
                    <TableCell className="capitalize">{member.member_type}</TableCell>
                    <TableCell>{member.share_quantity}</TableCell>
                    <TableCell>{member.mobile}</TableCell>
                    {isAdmin && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onApprove(member.id)}
                          >
                            <Check className="h-4 w-4 text-green-600" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onReject(member.id)}
                          >
                            <X className="h-4 w-4 text-red-600" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
