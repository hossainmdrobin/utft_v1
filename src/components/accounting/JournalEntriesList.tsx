import { useJournalEntries } from "./useJournalEntries";
import { statusColors } from "./constants";
import { dateRangeOptions } from "./constants";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { MoreVertical, Eye, CheckCircle, XCircle, Filter, Download, Printer, CalendarIcon, Search } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export function JournalEntriesList() {
  const {
    entryLoading,
    filteredEntries,
    selectedEntry,
    setSelectedEntry,
    dateRange,
    setDateRange,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    memberFilter,
    setMemberFilter,
    accountFilter,
    setAccountFilter,
    statusFilter,
    setStatusFilter,
    members,
    accounts,
    entryLines,
    selectedEntryData,
    postEntry,
    voidEntry,
    exportToPDF,
    handlePrint,
  } = useJournalEntries();
console.log("Sfdasefa",selectedEntry)
  const [memberSearch, setMemberSearch] = useState("")

  if (entryLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filters:</span>
        </div>

        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            {dateRangeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {dateRange === "custom" && (
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn(!customStartDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customStartDate ? format(customStartDate, "dd MMM yyyy") : "Start Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customStartDate}
                  onSelect={setCustomStartDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground">to</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn(!customEndDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customEndDate ? format(customEndDate, "dd MMM yyyy") : "End Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customEndDate}
                  onSelect={setCustomEndDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        <Select value={memberFilter} onValueChange={setMemberFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Member" />
          </SelectTrigger>
          <SelectContent>
            <div className="p-1">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="Search members..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  className="h-8 pl-7"
                />
              </div>
            </div>
            <SelectItem value="all">All Members</SelectItem>
            {members?.data?.filter((m) => {
              const q = memberSearch.toLowerCase()
              return (
                !q ||
                m.full_name?.toLowerCase().includes(q) ||
                String(m.beneficiary_id || "").toLowerCase().includes(q)
              )
            }).map((m) => (
              <SelectItem key={m.id} value={m.user_id || m.user_id}>
                {m.user_id} - {m.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={accountFilter} onValueChange={setAccountFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Account" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Accounts</SelectItem>
            {accounts?.data?.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.code} - {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="posted">Posted</SelectItem>
            <SelectItem value="voided">Voided</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={exportToPDF}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {!filteredEntries?.length ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No journal entries found</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entry #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Member</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 print:hidden">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.map((entry,i) => (
                <TableRow key={entry._id}>
                  <TableCell className="font-mono">{entry.entry_number}</TableCell>
                  <TableCell>{format(new Date(entry.entry_date), "dd MMM yyyy")}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {entry.description || entry.reference || "-"}
                  </TableCell>
                  <TableCell>
                    {entry.member ? (
                      <span className="text-sm">
                        {entry.member.beneficiary_id}
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    ৳{Number(entry.total_debit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[entry.status]}>
                      {entry.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="print:hidden">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedEntry(entry)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        {entry.status === "draft" && (
                          <>
                            <DropdownMenuItem onClick={() => postEntry.mutate(entry.id)}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Post Entry
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => voidEntry.mutate(entry.id)}
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
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              Journal Entry: {String(selectedEntry?._id)}
            </DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Date:</span>{" "}
                  {format(new Date(selectedEntry.entry_date), "dd MMM yyyy")}
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  <Badge variant="outline" className={statusColors[selectedEntry.status]}>
                    {selectedEntry.status}
                  </Badge>
                </div>
                {selectedEntry.reference && (
                  <div>
                    <span className="text-muted-foreground">Reference:</span>{" "}
                    {selectedEntry.reference}
                  </div>
                )}
                {selectedEntry.member_id && (
                  <div>
                    <span className="text-muted-foreground">Member:</span>{" "}
                    {typeof selectedEntry.member_id === "string"
                      ? selectedEntry.member_id
                      : selectedEntry.member_id.full_name}
                  </div>
                )}
              </div>
              {selectedEntry.description && (
                <p className="text-sm">{selectedEntry.description}</p>
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
                    {selectedEntry?.lines?.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell className="font-mono text-sm">
                          ACCOUNT NUMBER
                          {/* {line.account.code} - {line.account.name} */}
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
                  <tfoot className="bg-muted font-medium">
                    <tr>
                      <td colSpan={2} className="p-2 text-right">
                        Totals:
                      </td>
                      <td className="p-2 text-right font-mono">
                        ৳{Number(selectedEntry?.total_debit || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2 text-right font-mono">
                        ৳{Number(selectedEntry?.total_credit || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
