import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableRow, TableCell } from "@/components/ui/table";
import { MoreVertical, Eye, Edit2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useDeleteJournalEntryMutation } from "@/store/slices/journalEntrySlice/api.journalEntry";
import { toast } from "sonner";

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
  const [deleteEntry, { isLoading: deleteLoading }] = useDeleteJournalEntryMutation();

  const totalDebit = entry.lines?.reduce((sum, line) => sum + (line.debit || 0), 0) || 0;

  const handleDelete = async () => {
    if (!window.confirm("Delete this journal entry?")) return;
    try {
      await deleteEntry({ id: entry._id }).unwrap();
      toast.success("Entry deleted");
    } catch {
      toast.error("Failed to delete entry");
    }
  };

  const handleEdit = () => {
    toast.info("Edit entry is not yet available");
  };

  return (
    <TableRow key={entry._id}>
      <TableCell className="font-mono text-sm">{entry.reference || entry._id.toString().slice(-6)}</TableCell>
      <TableCell className="text-sm">
        {entry.date ? format(new Date(entry.date), "dd MMM yyyy") : "-"}
      </TableCell>
      <TableCell className="max-w-[200px] truncate text-sm">
        {entry.description || entry.reference || "-"}
      </TableCell>
      <TableCell className="text-sm">
        {entry.member?.full_name || entry.member?.user_id || "-"}
      </TableCell>
      <TableCell className="text-right font-mono text-sm">
        ৳{Number(totalDebit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
      </TableCell>
      <TableCell>
        {deleteLoading ? (
          <span className="text-sm bg-gray-300 animate-pulse" />
        ) : (
          <Badge variant="outline" className={statusColors[entry.status]}>
            {entry.status}
          </Badge>
        )}
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
            <DropdownMenuItem onClick={handleEdit}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Entry
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Entry
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
