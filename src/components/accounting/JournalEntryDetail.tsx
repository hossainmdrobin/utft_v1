import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/mongodb/client";
import { useGetMembersQuery } from "@/store/slices/memberSlice/api.member";
import { useGetAccountsQuery } from "@/store/slices/accountSlice/api.account";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { statusColors } from "./constants";
import { format } from "date-fns";
import { useGetEntryByIdQuery, useGetJournalEntryLinesQuery } from "@/store/slices/journalEntrySlice/api.journalEntry";

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
  console.log(entry,"asdfasd;flkasjdfl");
  

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

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entry?.lines?.map((line: JournalEntryLineWithAccount) => (
              <TableRow key={line.id || line._id}>
                <TableCell className="font-mono text-sm">
                  {line.account_id ? `${line.account_id.code} - ${line.account_id.name}` : "ACCOUNT NUMBER"}
                </TableCell>
                <TableCell className="text-sm">{line.description || "-"}</TableCell>
                <TableCell className="text-right font-mono">
                  {Number(line.debit) > 0
                    ? `৳${Number(line.debit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                    : "-"}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {Number(line.credit) > 0
                    ? `৳${Number(line.credit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                    : "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <tr>
              <td colSpan={2} className="p-2 text-right">
                Totals:
              </td>
              <td className="p-2 text-right font-mono">
                ৳{Number(entry?.total_debit || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </td>
              <td className="p-2 text-right font-mono">
                ৳{Number(entry?.total_credit || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
}
