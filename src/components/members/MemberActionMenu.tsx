import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";

type MemberStatus = "pending" | "active" | "inactive" | "deceased";

interface MemberActionMenuProps {
  memberId: string;
  status: MemberStatus;
  // onStatusChange: (memberId: string, newStatus: string) => void;
  showApproveReject?: boolean;
  onApprove?: (memberId: string) => void;
  onReject?: (memberId: string) => void;
}

export function MemberActionMenu({
  memberId,
  status,
  // onStatusChange,
  showApproveReject = false,
  onApprove,
  onReject,
}: MemberActionMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {showApproveReject && (
          <>
            <DropdownMenuItem onClick={() => onApprove?.(memberId)}>
              Approve
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onReject?.(memberId)}>
              Reject
            </DropdownMenuItem>
          </>
        )}
        {status !== "active" && (
          <DropdownMenuItem
            // onClick={() => onStatusChange(memberId, "active")}
          >
            Mark as Active
          </DropdownMenuItem>
        )}
        {status !== "deceased" && (
          <DropdownMenuItem
            // onClick={() => onStatusChange(memberId, "deceased")}
          >
            Mark as Deceased
          </DropdownMenuItem>
        )}
        {status !== "inactive" && (
          <DropdownMenuItem
            // onClick={() => onStatusChange(memberId, "inactive")}
          >
            Mark as Inactive
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
