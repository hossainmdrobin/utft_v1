"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JournalEntryDialog } from "@/components/accounting/JournalEntryDialog";
import { JournalEntriesList } from "@/components/accounting/JournalEntriesList";

export function JournalEntriesTab() {
  return (
    <Card className="shadow-soft">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Journal Entries</CardTitle>
        <JournalEntryDialog />
      </CardHeader>
      <CardContent>
        <JournalEntriesList />
      </CardContent>
    </Card>
  );
}
