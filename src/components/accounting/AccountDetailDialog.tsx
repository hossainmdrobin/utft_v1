"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { statusColors } from "./constants";
import { AccountDoc } from "@/models/Account";
import { useGetJournalEntriesQuery } from "@/store/slices/journalEntrySlice/api.journalEntry";
import { format } from "date-fns";

interface AccountDetailDialogProps {
  account: AccountDoc;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountDetailDialog({ account, open, onOpenChange }: AccountDetailDialogProps) {
  const { data, isLoading } = useGetJournalEntriesQuery(
    { account: String(account._id) },
    { skip: !open },
  );
interface TransactionLine {
  account?: { _id?: string } | string;
  debit?: number;
  credit?: number;
  description?: string | null;
}

interface TransactionEntry {
  _id: string;
  date: string;
  description?: string;
  reference?: string;
  status: string;
  lines?: TransactionLine[];
}

  const entries: TransactionEntry[] = (data as { data?: TransactionEntry[] })?.data ?? [];

  const rows = entries.flatMap((entry: TransactionEntry) => {
    const lines = (entry.lines || []).filter(
      (line: TransactionLine) => String(
        typeof line.account === "object" ? line.account?._id : line.account,
      ) === String(account._id),
    );
    return lines.map((line: TransactionLine) => ({
      entryId: String(entry._id),
      date: entry.date,
      description: entry.description || entry.reference || "-",
      reference: entry.reference,
      status: entry.status,
      debit: Number(line.debit) || 0,
      credit: Number(line.credit) || 0,
    }));
  });

  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Account Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Code:</span>{" "}
              <span className="font-mono">{account.code || "-"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Name:</span> {account.name}
            </div>
            <div>
              <span className="text-muted-foreground">Type:</span>{" "}
              <Badge variant="outline">{account.type}</Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Balance:</span>{" "}
              <span className="font-mono">
                ৳{Number(account.balance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span>{" "}
              {account.isActive ? "Active" : "Inactive"}
            </div>
            {account.description && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Description:</span> {account.description}
              </div>
            )}
          </div>

          <div>
            <h4 className="font-semibold mb-2">Transactions</h4>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No transactions found
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, idx) => (
                      <TableRow key={`${row.entryId}-${idx}`}>
                        <TableCell className="text-sm">
                          {row.date ? format(new Date(row.date), "dd MMM yyyy") : "-"}
                        </TableCell>
                        <TableCell className="text-sm max-w-[220px] truncate">
                          {row.description}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusColors[row.status]}>
                            {row.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {row.debit > 0
                            ? `৳${row.debit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {row.credit > 0
                            ? `৳${row.credit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <tfoot>
                    <tr className="border-t">
                      <td colSpan={3} className="p-2 text-right font-semibold">
                        Totals:
                      </td>
                      <td className="p-2 text-right font-mono font-semibold">
                        ৳{totalDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2 text-right font-mono font-semibold">
                        ৳{totalCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </Table>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AccountNameCell({ account }: { account: AccountDoc }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <span
        className="cursor-pointer text-primary hover:underline"
        onClick={() => setOpen(true)}
      >
        {account.name}
      </span>
      <AccountDetailDialog account={account} open={open} onOpenChange={setOpen} />
    </>
  );
}
