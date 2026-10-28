import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { useGetJournalEntriesQuery } from "@/store/slices/journalEntrySlice/api.journalEntry";
import { useGetMembersQuery } from "@/store/slices/memberSlice/api.member";
import { useGetAccountsQuery } from "@/store/slices/accountSlice/api.account";
import { useUpdateJournalEntryMutation } from "@/store/slices/journalEntrySlice/api.journalEntry";
import { toast } from "sonner";
import { JournalEntryDoc } from "@/models/JournalEntry";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function useJournalEntries() {
  const [selectedEntry, setSelectedEntry] = useState<JournalEntryDoc | null>(null);
  const [dateRange, setDateRange] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [memberFilter, setMemberFilter] = useState("all");
  const [accountFilter, setAccountFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [postEntry] = useUpdateJournalEntryMutation();
  const [voidEntry] = useUpdateJournalEntryMutation();

  const { data: journalEntries, isLoading: entryLoading, error: entryError } =
    useGetJournalEntriesQuery();
  const { data: entryData, count } = journalEntries || {};
  const { data: members } = useGetMembersQuery();
  const { data: accounts } = useGetAccountsQuery();

  const updateEntryStatus = async (id: string, status: string) => {
    try {
      await postEntry({ id, status }).unwrap();
      toast.success(`Entry ${status}`);
    } catch {
      toast.error(`Failed to ${status} entry`);
    }
  };

  const filteredEntries = useMemo(() => {
    if (!entryData) return [];

    let filtered = [...entryData];

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
          const entryDate = new Date(entry.date);
          return entryDate >= startDate! && entryDate <= endDate!;
        });
      }
    }

    if (memberFilter !== "all") {
      filtered = filtered.filter((entry) => entry.member?.user_id === memberFilter);
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((entry) => entry.status === statusFilter);
    }

    return filtered;
  }, [entryData, dateRange, customStartDate, customEndDate, memberFilter, statusFilter]);

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Journal Entries Report", 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated on: ${format(new Date(), "dd MMM yyyy HH:mm")}`, 14, 30);

    const tableData = filteredEntries.map((entry) => {
      const lines = entry.lines || [];
      const totalDebit = lines.reduce((s: number, l: any) => s + (l.debit || 0), 0);
      return [
        entry.reference || entry.id,
        format(new Date(entry.date), "dd MMM yyyy"),
        entry.description || entry.reference || "-",
        entry.member?.user_id || "-",
        `BDT ${Number(totalDebit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
        entry.status,
      ];
    });

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

  const postEntryAction = (id: string) => updateEntryStatus(id, "posted");
  const voidEntryAction = (id: string) => updateEntryStatus(id, "void");

  return {
    entryData,
    entryLoading,
    entryError,
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
    count,
    postEntry: postEntryAction,
    voidEntry: voidEntryAction,
    exportToPDF,
    handlePrint,
  };
}
