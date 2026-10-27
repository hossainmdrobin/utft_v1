import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { JournalEntryForm } from "./journalEntry/JournalEntryForm";
import { useJournalEntryForm } from "./journalEntry/useJournalEntryForm";
import { JournalEntryDialogPropsType as JournalEntryDialogProps } from "./journalEntry/types";

export function JournalEntryDialog({ trigger }: JournalEntryDialogProps) {
  const [open, setOpen] = useState(false);
  const {
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
    members,
    filter,
    setFilter,
    handleSubmit,
    entryLoading,
    entryData,
    entryError,
  } = useJournalEntryForm();

  useEffect(() => {
    if (entryData) {
      toast.success("Journal entry created successfully");
      setOpen(false);
    }
    if (entryError) {
      toast.error((entryError as any)?.message || "Failed to create journal entry");
    }
  }, [entryData, entryError]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Transaction
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Journal Entry</DialogTitle>
        </DialogHeader>
        <JournalEntryForm
          form={form}
          fields={fields}
          append={append}
          remove={remove}
          lines={lines}
          totalDebit={totalDebit}
          totalCredit={totalCredit}
          isBalanced={isBalanced}
          accountSearch={accountSearch}
          setAccountSearch={setAccountSearch}
          accounts={accounts}
          members={members}
          filter={filter}
          setFilter={setFilter}
          onSubmit={handleSubmit}
          entryLoading={entryLoading}
        />
      </DialogContent>
    </Dialog>
  );
}