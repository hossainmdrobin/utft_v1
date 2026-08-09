"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateAccountDialog } from "./CreateAccountDialog";
import { AccountsList } from "@/components/accounting/AccountsList";
import { AccountingSummaryCards } from "./AccountingSummaryCards";
import { AccountDoc } from "@/models/Account";

interface ChartOfAccountsTabProps {
  summary: {
    assets: number;
    liabilities: number;
    equity: number;
    income: number;
    expenses: number;
  },
  accounts:AccountDoc[]
}

export function ChartOfAccountsTab({ summary,accounts }: ChartOfAccountsTabProps) {
  return (
    <div className="space-y-4">
      <AccountingSummaryCards summary={summary} />
      <Card className="shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Chart of Accounts</CardTitle>
          <CreateAccountDialog />
        </CardHeader>
        <CardContent>
          <AccountsList accounts={accounts} />
        </CardContent>
      </Card>
    </div>
  );
}
