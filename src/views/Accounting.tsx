"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Receipt, TrendingUp, Wallet } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/mongodb/client";
import { CreateAccountDialog } from "@/components/accounting/CreateAccountDialog";
import { JournalEntryDialog } from "@/components/accounting/JournalEntryDialog";
import { AccountsList } from "@/components/accounting/AccountsList";
import { JournalEntriesList } from "@/components/accounting/JournalEntriesList";

export default function Accounting() {
  const { data: accountsSummary } = useQuery({
    queryKey: ["accounts-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("account_type, current_balance")
        .eq("is_active", true)
        .eq("is_system", false);
      if (error) throw error;

      const summary = {
        assets: 0,
        liabilities: 0,
        equity: 0,
        income: 0,
        expenses: 0,
      };

      data.forEach((acc) => {
        const balance = Number(acc.current_balance);
        switch (acc.account_type) {
          case "asset":
            summary.assets += balance;
            break;
          case "liability":
            summary.liabilities += balance;
            break;
          case "equity":
            summary.equity += balance;
            break;
          case "income":
            summary.income += balance;
            break;
          case "expense":
            summary.expenses += balance;
            break;
        }
      });

      return summary;
    },
  });

  const formatCurrency = (amount: number) => {
    return `৳${amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
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

          <TabsContent value="accounts" className="space-y-4">
            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="shadow-soft">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Assets
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {formatCurrency(accountsSummary?.assets || 0)}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-soft">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Liabilities
                  </CardTitle>
                  <Receipt className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {formatCurrency(accountsSummary?.liabilities || 0)}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-soft">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Equity
                  </CardTitle>
                  <BookOpen className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {formatCurrency(accountsSummary?.equity || 0)}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-soft">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Net Income
                  </CardTitle>
                  <Wallet className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {formatCurrency(
                      (accountsSummary?.income || 0) - (accountsSummary?.expenses || 0)
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Chart of Accounts */}
            <Card className="shadow-soft">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Chart of Accounts</CardTitle>
                <CreateAccountDialog />
              </CardHeader>
              <CardContent>
                <AccountsList />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <Card className="shadow-soft">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Journal Entries</CardTitle>
                <JournalEntryDialog />
              </CardHeader>
              <CardContent>
                <JournalEntriesList />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

