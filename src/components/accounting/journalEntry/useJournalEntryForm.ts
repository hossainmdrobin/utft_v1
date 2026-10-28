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
  const { data: accountsData, isLoading: accountLoading } = useGetAccountsQuery();
  const { data: membersData, isLoading: memberLoading } = useGetMembersQuery(filter);
  const [accountSearch, setAccountSearch] = useState<Record<number, string>>({});

  const accounts = accountsData?.data;
  const members = membersData?.data;

  const form = useForm<JournalEntryFormValues>({
    resolver: zodResolver(journalEntrySchema),
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
      reference: "",
      description: "",
      member: "",
      lines: [
        { account: "", description: "", debit: 0, credit: 0 },
        { account: "", description: "", debit: 0, credit: 0 },
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

  const handleSubmit = (values: JournalEntryFormValues) => {
    const cleaned = {
      ...values,
      member: values.member || undefined,
      lines: values.lines.map((l) => ({
        account: l.account,
        description: l.description,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
      })),
    };
    return createJournalEntry(cleaned);
  };

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
    handleSubmit,
    entryLoading,
    entryData,
    entryError,
  };
}
