"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Edit } from "lucide-react";

interface MemberHeaderProps {
  memberId: string;
  isAdmin: boolean;
  onEditClick: () => void;
}

export function MemberHeader({ memberId, onEditClick }: MemberHeaderProps) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between">
      <Button variant="outline" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Members
      </Button>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => router.push(`/members/${memberId}/financial-report`)}
        >
          <FileText className="h-4 w-4 mr-2" />
          Financial Report
        </Button>
        <Button onClick={onEditClick}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Member
        </Button>
      </div>
    </div>
  );
}
