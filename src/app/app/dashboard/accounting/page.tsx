"use client";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useGetAccountsQuery } from "@/store/slices/accountSlice/api.account";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JournalEntryDialog } from "@/components/accounting/JournalEntryDialog";
import { ChartOfAccountsTab } from "./ChartOfAccountsTab";
import { JournalEntriesTab } from "./JournalEntriesTab";

export default function Page() {
  const { data: accountsData } = useGetAccountsQuery();
  const accounts = accountsData?.data ?? [];

  const summary = accounts.reduce(
    (acc, acc_) => {
      const balance = Number(acc_.current_balance);
      switch (acc_.account_type) {
        case "asset":
          acc.assets += balance;
          break;
        case "liability":
          acc.liabilities += balance;
          break;
        case "equity":
          acc.equity += balance;
          break;
        case "income":
          acc.income += balance;
          break;
        case "expense":
          acc.expenses += balance;
          break;
      }
      return acc;
    },
    { assets: 0, liabilities: 0, equity: 0, income: 0, expenses: 0 } as Record<string, number>
  );

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Accounting</h2>
            <p className="text-muted-foreground mt-1">
              Manage accounts, transactions, and financial reports
            </p>
          </div>
          <JournalEntryDialog />
        </div>

        <Tabs defaultValue="accounts" className="space-y-4">
          <TabsList>
            <TabsTrigger value="accounts">Chart of Accounts</TabsTrigger>
            <TabsTrigger value="transactions">Journal Entries</TabsTrigger>
          </TabsList>

          <TabsContent value="accounts">
            <ChartOfAccountsTab accounts={accounts} summary={summary} />
          </TabsContent>

          <TabsContent value="transactions">
            <JournalEntriesTab />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
