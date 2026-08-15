import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MemberActionMenu } from "@/components/members/MemberActionMenu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ActiveMembersTableProps {
  members: any[];
  receivables: Record<string, { amount: number; status: string }>;
  isAdmin: boolean;
  onMemberClick: (memberId: string) => void;
  onFinancialReportClick: (memberId: string) => void;
  onStatusChange: (memberId: string, newStatus: string) => void;
}

export function ActiveMembersTable({
  members,
  receivables,
  isAdmin,
  onMemberClick,
  onFinancialReportClick,
  onStatusChange,
}: ActiveMembersTableProps) {
  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle>Active Members ({members.filter((m) => m.status === "active").length})</CardTitle>
      </CardHeader>
      <CardContent>
        {members.filter((m) => m.status === "active").length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No active members
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Member Type</TableHead>
                <TableHead>Share Qty</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead className="cursor-pointer hover:underline">Receivables</TableHead>
                {isAdmin && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members
                .filter((m) => m.status === "active")
                .map((member) => (
                  <TableRow key={member.id}>
                    <TableCell
                      className="font-medium cursor-pointer hover:underline"
                      onClick={() => onMemberClick(member.id)}
                    >
                      {member.beneficiary_id}
                    </TableCell>
                    <TableCell
                      className="cursor-pointer hover:underline"
                      onClick={() => onMemberClick(member.id)}
                    >
                      {member.full_name}
                    </TableCell>
                    <TableCell
                      className="capitalize cursor-pointer"
                      onClick={() => onMemberClick(member.id)}
                    >
                      {member.member_type}
                    </TableCell>
                    <TableCell
                      className="cursor-pointer"
                      onClick={() => onMemberClick(member.id)}
                    >
                      {member.share_quantity}
                    </TableCell>
                    <TableCell
                      className="cursor-pointer"
                      onClick={() => onMemberClick(member.id)}
                    >
                      {member.mobile}
                    </TableCell>
                    <TableCell
                      className="font-semibold cursor-pointer text-primary hover:underline"
                      onClick={() => onFinancialReportClick(member.id)}
                    >
                      ৳{(receivables[member.id]?.amount || 0).toFixed(2)}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <MemberActionMenu
                          memberId={member.id}
                          status={member.status}
                          onStatusChange={onStatusChange}
                        />
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
