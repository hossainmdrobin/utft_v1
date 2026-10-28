import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableRow, TableCell } from "@/components/ui/table";
import { MoreVertical, Eye, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { useUpdateJournalEntryMutation } from "@/store/slices/journalEntrySlice/api.journalEntry";
import { toast } from "sonner";
import { useEffect } from "react";

interface JournalEntryLineWithAccount {
  debit: number;
  credit: number;
}

interface JournalEntryListItem {
  _id: string;
  id: string;
  reference?: string;
  date: string;
  description?: string;
  member?: { user_id: string; full_name?: string };
  lines?: JournalEntryLineWithAccount[];
  status: string;
}

interface JournalEntriesTableProps {
  entry: JournalEntryListItem;
  statusColors: Record<string, string>;
  onSelectEntry: (entry: JournalEntryListItem) => void;
}

export function JournalEntriesTable({ entry, statusColors, onSelectEntry }: JournalEntriesTableProps) {
  const [updateEntry, { isLoading, error }] = useUpdateJournalEntryMutation();

  useEffect(() => {
    if (error) {
      toast.error("Failed to update entry");
    }
  }, [error]);

  const totalDebit = entry.lines?.reduce((sum, line) => sum + (line.debit || 0), 0) || 0;
  const totalCredit = entry.lines?.reduce((sum, line) => sum + (line.credit || 0), 0) || 0;
  return (
    <TableRow key={entry._id}>
      <TableCell className="font-mono">{entry.reference || entry._id.toString().slice(-6)}</TableCell>
      <TableCell>
        {entry.date ? format(new Date(entry.date), "dd MMM yyyy") : "-"}
      </TableCell>
      <TableCell className="max-w-[200px] truncate">
        {entry.description || entry.reference || "-"}
      </TableCell>
      <TableCell>
        {entry.member ? (
          <span className="text-sm">
            {entry.member.user_id}
          </span>
        ) : (
          "-"
        )}
      </TableCell>
      <TableCell className="text-right font-mono">
        ৳{Number(totalDebit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
      </TableCell>
      <TableCell className="text-right font-mono">
        ৳{Number(totalCredit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
      </TableCell>
      <TableCell>
        {isLoading && <span className="text-sm bg-gray-300 animate-pulse"></span>}
        {!isLoading &&<Badge variant="outline" className={statusColors[entry.status]}>
          {entry.status}
        </Badge>}
      </TableCell>
      <TableCell className="print:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onSelectEntry(entry)}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            {entry.status === "draft" && !isLoading && (
              <>
                <DropdownMenuItem onClick={() => updateEntry({ id: entry._id, status: "posted" })}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Post Entry
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => updateEntry({ id: entry._id, status: "void" })}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Void Entry
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
