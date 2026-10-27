import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { toast } from "sonner";
import { format } from "date-fns";
import { useCreateJournalEntryMutation } from "@/store/slices/journalEntrySlice/api.journalEntry";
import { useGetAccountsQuery } from "@/store/slices/accountSlice/api.account";
import { useGetMembersQuery } from "@/store/slices/memberSlice/api.member";
import { memberFilterWithKeyTypeRoleType } from "@/app/app/dashboard/accounting/filters";
import { JournalEntryFormValues, journalEntrySchema } from "./types";
import { zodResolver } from "@hookform/resolvers/zod";

export function useJournalEntryForm() {
  const [filter, setFilter] = useState<memberFilterWithKeyTypeRoleType>({});
  const [createJournalEntry, { data: entryData, isLoading: entryLoading, error: entryError }] =
    useCreateJournalEntryMutation();
  const { data: accounts, isLoading: accountLoading } = useGetAccountsQuery();
  const { data: members, isLoading: memberLoading } = useGetMembersQuery(filter);
  const [accountSearch, setAccountSearch] = useState<Record<number, string>>({});

  const form = useForm<JournalEntryFormValues>({
    resolver: zodResolver(journalEntrySchema),
    defaultValues: {
      entry_date: format(new Date(), "yyyy-MM-dd"),
      reference: "",
      description: "",
      member_id: "",
      lines: [
        { account_id: "", description: "", debit: 0, credit: 0 },
        { account_id: "", description: "", debit: 0, credit: 0 },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  const lines = form.watch("lines");
  const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  useEffect(() => {
    if (entryData) {
      toast.success("Journal entry created successfully");
      form.reset();
    }
    if (entryError) toast.error(entryError?.message || "Failed to create journal entry");
  }, [entryData, entryError]);

  return {
    form,
    fields,
    append,
    remove,
    lines,
    totalDebit,
    totalCredit,
    isBalanced,
    accountSearch,
    setAccountSearch,
    accounts,
    accountLoading,
    members,
    memberLoading,
    filter,
    setFilter,
    createJournalEntry,
    entryLoading,
  };
}