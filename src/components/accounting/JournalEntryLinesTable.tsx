import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";

interface JournalEntryLineWithAccount {
  id: string;
  _id?: string;
  description: string | null;
  debit: number;
  credit: number;
  account_id: { code: string; name: string } | null;
}

interface JournalEntryLinesTableProps {
  lines: JournalEntryLineWithAccount[];
  totalDebit: number;
  totalCredit: number;
}

export function JournalEntryLinesTable({ lines, totalDebit, totalCredit }: JournalEntryLinesTableProps) {
  return (
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
          {lines?.map((line: JournalEntryLineWithAccount) => (
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
              ৳{Number(totalDebit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </td>
            <td className="p-2 text-right font-mono">
              ৳{Number(totalCredit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </td>
          </tr>
        </TableFooter>
      </Table>
    </div>
  );
}