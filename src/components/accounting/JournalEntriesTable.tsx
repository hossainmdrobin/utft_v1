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

interface JournalEntryListItem {
  _id: string;
  id: string;
  entry_number: string;
  entry_date: string;
  description?: string;
  reference?: string;
  member?: { user_id: string };
  lines?: Array<{ debit: number }>;
  status: string;
}

interface JournalEntriesTableProps {
  entry: JournalEntryListItem;
  statusColors: Record<string, string>;
  onSelectEntry: (entry: JournalEntryListItem) => void;
}

export function JournalEntriesTable({ entry, statusColors, onSelectEntry }: JournalEntriesTableProps) {
  const [updateEntry, { data, isLoading, error }] = useUpdateJournalEntryMutation();

  const totalDebit = entry.lines?.reduce((sum, line) => sum + line.debit, 0) || 0;
  return (
    <TableRow key={entry._id}>
      <TableCell className="font-mono">{entry.entry_number}</TableCell>
      <TableCell>{format(new Date(entry.entry_date), "dd MMM yyyy")}</TableCell>
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
                <DropdownMenuItem onClick={() => updateEntry({ id: entry._id, status: "approved" })}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Entry
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => updateEntry({ id: entry._id, status: "voided" })}
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
