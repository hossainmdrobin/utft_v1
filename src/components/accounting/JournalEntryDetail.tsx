import { Badge } from "@/components/ui/badge";
import { JournalEntryLinesTable } from "./JournalEntryLinesTable";
import { statusColors } from "./constants";
import { format } from "date-fns";
import { useGetEntryByIdQuery } from "@/store/slices/journalEntrySlice/api.journalEntry";

interface JournalEntryDetailProps {
  _id: string;
}

interface JournalEntryLineWithAccount {
  id: string;
  _id?: string;
  description: string | null;
  debit: number;
  credit: number;
  account_id: { code: string; name: string } | null;
}

export function JournalEntryDetail({ _id }: JournalEntryDetailProps) {

  const { data, isLoading: entryLoading } = useGetEntryByIdQuery({id:_id});
  const {data:entry} = data || {};
const totalDebit = entry?.lines?.reduce((sum: number, line: JournalEntryLineWithAccount) => sum + (line.debit || 0), 0) || 0;
const totalCredit = entry?.lines?.reduce((sum: number, line: JournalEntryLineWithAccount) => sum + (line.credit || 0), 0) || 0;  

  if (entryLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="h-4 bg-muted rounded animate-pulse" />
          <div className="h-4 bg-muted rounded animate-pulse" />
        </div>
        <div className="border rounded-lg p-4">
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-8 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Journal entry not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Date:</span>{" "}
          {format(new Date(entry.created_at), "dd MMM yyyy")}
        </div>
        <div>
          <span className="text-muted-foreground">Status:</span>{" "}
          <Badge variant="outline" className={statusColors[entry.status]}>
            {entry.status}
          </Badge>
        </div>
        {entry.reference && (
          <div>
            <span className="text-muted-foreground">Reference:</span>{" "}
            {entry.reference}
          </div>
        )}
        
        {entry.created_by && (
          <div>
            <span className="text-muted-foreground">Created By:</span>{" "}
            {entry?.created_by.full_name+" - "+entry?.created_by?.user_id}
          </div>
        )}
      </div>
      {entry.description && (
        <p className="text-sm">{entry.description}</p>
      )}

      <JournalEntryLinesTable lines={entry?.lines} totalDebit={totalDebit} totalCredit={totalCredit} />
    </div>
  );
}
