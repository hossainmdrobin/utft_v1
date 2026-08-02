import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/mongodb/client";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { useGetJournalEntriesQuery } from "@/store/slices/journalEntrySlice/api.journalEntry";
import { useGetMembersQuery } from "@/store/slices/memberSlice/api.member";
import { useGetAccountsQuery } from "@/store/slices/accountSlice/api.account";
import { useState, useMemo } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { JournalEntry, JournalLine, DateRangeValue } from "./types";
import { JournalEntryDoc } from "@/models/JournalEntry";

export function useJournalEntries() {
  const [selectedEntry, setSelectedEntry] = useState<JournalEntryDoc | null>(null);
  const [dateRange, setDateRange] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [memberFilter, setMemberFilter] = useState("all");
  const [accountFilter, setAccountFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: journalEntries, isLoading: entryLoading, error: entryError } =
    useGetJournalEntriesQuery();
  const { data: entryData, count } = journalEntries || {};
  const { data: members } = useGetMembersQuery();
  const { data: accounts } = useGetAccountsQuery();

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

    if (memberFilter !== "all") {
      filtered = filtered.filter((entry) => entry.member?.beneficiary_id === memberFilter);
    }

    if (accountFilter !== "all" && allEntryLines) {
      const entryIdsWithAccount = allEntryLines
        .filter((line) => line.account_id === accountFilter)
        .map((line) => line.journal_entry_id);
      filtered = filtered.filter((entry) => entryIdsWithAccount.includes(entry.id));
    }

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
    entryLines,
    selectedEntryData,
    postEntry,
    voidEntry,
    exportToPDF,
    handlePrint,
  };
}
