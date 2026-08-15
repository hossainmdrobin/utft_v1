import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MemberActionMenu } from "@/components/members/MemberActionMenu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DeceasedMembersTableProps {
  members: any[];
  isAdmin: boolean;
  onMemberClick: (memberId: string) => void;
  onStatusChange: (memberId: string, newStatus: string) => void;
}

export function DeceasedMembersTable({
  members,
  isAdmin,
  onMemberClick,
  onStatusChange,
}: DeceasedMembersTableProps) {
  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle>
          Deceased Members ({members.filter((m) => m.status === "deceased").length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {members.filter((m) => m.status === "deceased").length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No deceased members
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Member Type</TableHead>
                <TableHead>Deceased Date</TableHead>
                {isAdmin && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members
                .filter((m) => m.status === "deceased")
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
                      {member.deceased_at
                        ? new Date(member.deceased_at).toLocaleDateString()
                        : "N/A"}
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
