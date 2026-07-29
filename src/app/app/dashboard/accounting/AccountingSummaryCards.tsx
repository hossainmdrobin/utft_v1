"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Receipt, TrendingUp, Wallet } from "lucide-react";

interface AccountingSummaryCardsProps {
  summary: {
    assets: number;
    liabilities: number;
    equity: number;
    income: number;
    expenses: number;
  };
}

const formatCurrency = (amount: number) => {
  return `৳${amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
};

export function AccountingSummaryCards({ summary }: AccountingSummaryCardsProps) {
  return (
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
            {formatCurrency(summary?.assets || 0)}
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
            {formatCurrency(summary?.liabilities || 0)}
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
            {formatCurrency(summary?.equity || 0)}
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
              (summary?.income || 0) - (summary?.expenses || 0)
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
