import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/mongodb/client";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import {useGetJournalEntriesQuery} from "@/store/slices/journalEntrySlice/api.journalEntry";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import { MoreVertical, Eye, CheckCircle, XCircle, Filter, Download, Printer, CalendarIcon } from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useGetMembersQuery } from "@/store/slices/memberSlice/api.member";
import { useGetAccountsQuery } from "@/store/slices/accountSlice/api.account";

type JournalEntry = {
  id: string;
  entry_number: string;
  entry_date: string;
  reference: string | null;
  description: string | null;
  status: string;
  total_debit: number;
  total_credit: number;
  created_at: string;
  member: { full_name: string; beneficiary_id: string } | null;
};

type JournalLine = {
  id: string;
  description: string | null;
  debit: number;
  credit: number;
  account: { code: string; name: string };
};

const statusColors: Record<string, string> = {
  draft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  posted: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  voided: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const dateRangeOptions = [
  { value: "all", label: "All Time" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "last_3_months", label: "Last 3 Months" },
  { value: "last_6_months", label: "Last 6 Months" },
  { value: "this_year", label: "This Year" },
  { value: "custom", label: "Custom Range" },
];

export function JournalEntriesList() {
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState("all");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [memberFilter, setMemberFilter] = useState("all");
  const [accountFilter, setAccountFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const queryClient = useQueryClient();

  const {data:journalEntries, isLoading:entryLoading, error:entryError} = useGetJournalEntriesQuery()
  const {data:entryData, count } = journalEntries || {}
  const { data: members } = useGetMembersQuery();
  const {data:accounts} = useGetAccountsQuery()


  const { data: entryLines } = useQuery({
    queryKey: ["journal-entry-lines", selectedEntry],
    queryFn: async () => {
      if (!selectedEntry) return null;
      const { data, error } = await supabase
        .from("journal_entry_lines")
        .select(`
          *,
          account:accounts(code, name)
        `)
        .eq("journal_entry_id", selectedEntry)
        .order("debit", { ascending: false });
      if (error) throw error;
      return data as JournalLine[];
    },
    enabled: !!selectedEntry,
  });

  const { data: allEntryLines } = useQuery({
    queryKey: ["all-journal-entry-lines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journal_entry_lines")
        .select("journal_entry_id, account_id");
      if (error) throw error;
      return data;
    },
  });

  const filteredEntries = useMemo(() => {
    if (!entryData) return [];

    let filtered = [...entryData];

    // Date range filter
    if (dateRange !== "all") {
      const now = new Date();
      let startDate: Date | undefined;
      let endDate: Date | undefined;

      switch (dateRange) {
        case "this_month":
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        case "last_month":
          startDate = startOfMonth(subMonths(now, 1));
          endDate = endOfMonth(subMonths(now, 1));
          break;
        case "last_3_months":
          startDate = startOfMonth(subMonths(now, 2));
          endDate = endOfMonth(now);
          break;
        case "last_6_months":
          startDate = startOfMonth(subMonths(now, 5));
          endDate = endOfMonth(now);
          break;
        case "this_year":
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = new Date(now.getFullYear(), 11, 31);
          break;
        case "custom":
          startDate = customStartDate;
          endDate = customEndDate;
          break;
      }

      if (startDate && endDate) {
        filtered = filtered.filter((entry) => {
          const entryDate = new Date(entry.entry_date);
          return entryDate >= startDate! && entryDate <= endDate!;
        });
      }
    }

    // Member filter
    if (memberFilter !== "all") {
      filtered = filtered.filter((entry) => entry.member?.beneficiary_id === memberFilter);
    }

    // Account filter
    if (accountFilter !== "all" && allEntryLines) {
      const entryIdsWithAccount = allEntryLines
        .filter((line) => line.account_id === accountFilter)
        .map((line) => line.journal_entry_id);
      filtered = filtered.filter((entry) => entryIdsWithAccount.includes(entry.id));
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((entry) => entry.status === statusFilter);
    }

    return filtered;
  }, [entryData, dateRange, customStartDate, customEndDate, memberFilter, accountFilter, statusFilter, allEntryLines]);

  const postEntry = useMutation({
    mutationFn: async (id: string) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("journal_entries")
        .update({
          status: "posted",
          posted_by: user.user?.id,
          posted_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Journal entry posted");
    },
    onError: () => {
      toast.error("Failed to post entry");
    },
  });

  const voidEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("journal_entries")
        .update({ status: "voided" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      toast.success("Journal entry voided");
    },
    onError: () => {
      toast.error("Failed to void entry");
    },
  });

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Journal Entries Report", 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated on: ${format(new Date(), "dd MMM yyyy HH:mm")}`, 14, 30);

    const tableData = filteredEntries.map((entry) => [
      entry.entry_number,
      format(new Date(entry.entry_date), "dd MMM yyyy"),
      entry.description || entry.reference || "-",
      entry.member?.beneficiary_id || "-",
      `BDT ${Number(entry.total_debit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      entry.status,
    ]);

    autoTable(doc, {
      head: [["Entry #", "Date", "Description", "Member", "Amount", "Status"]],
      body: tableData,
      startY: 38,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save("journal-entries.pdf");
    toast.success("PDF exported successfully");
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedEntryData = entryData?.find((e) => e.id === selectedEntry);

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
            <SelectItem value="all">All Members</SelectItem>
            {members?.data?.map((m) => (
              <SelectItem key={m.id} value={m.beneficiary_id || m.id}>
                {m.beneficiary_id} - {m.full_name}
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
              {filteredEntries.map((entry) => (
                <TableRow key={entry.id}>
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
                        <DropdownMenuItem onClick={() => setSelectedEntry(entry.id)}>
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
              Journal Entry: {selectedEntryData?.entry_number}
            </DialogTitle>
          </DialogHeader>
          {selectedEntryData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Date:</span>{" "}
                  {format(new Date(selectedEntryData.entry_date), "dd MMM yyyy")}
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  <Badge variant="outline" className={statusColors[selectedEntryData.status]}>
                    {selectedEntryData.status}
                  </Badge>
                </div>
                {selectedEntryData.reference && (
                  <div>
                    <span className="text-muted-foreground">Reference:</span>{" "}
                    {selectedEntryData.reference}
                  </div>
                )}
                {selectedEntryData.member && (
                  <div>
                    <span className="text-muted-foreground">Member:</span>{" "}
                    {selectedEntryData.member.full_name}
                  </div>
                )}
              </div>
              {selectedEntryData.description && (
                <p className="text-sm">{selectedEntryData.description}</p>
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
                    {entryLines?.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell className="font-mono text-sm">
                          {line.account.code} - {line.account.name}
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
                        ৳{Number(selectedEntryData.total_debit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2 text-right font-mono">
                        ৳{Number(selectedEntryData.total_credit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
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
