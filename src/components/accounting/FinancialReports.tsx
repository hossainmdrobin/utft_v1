import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/mongodb/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Download, Printer, CalendarIcon, TrendingUp, TrendingDown, DollarSign, Wallet, Settings2 } from "lucide-react";
import { useState } from "react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import { CustomReportBuilder } from "./CustomReportBuilder";
import autoTable from "jspdf-autotable";

type Account = {
  id: string;
  code: string;
  name: string;
  account_type: string;
  current_balance: number;
  is_system: boolean;
  is_contra: boolean;
  parent_account_id: string | null;
};

type ReportType = "trial_balance" | "balance_sheet" | "pnl" | "cash_flow" | "journal_report" | "custom" | null;

const periodOptions = [
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "last_3_months", label: "Last 3 Months" },
  { value: "last_6_months", label: "Last 6 Months" },
  { value: "this_year", label: "This Year" },
  { value: "custom", label: "Custom Period" },
];

export function FinancialReports() {
  const [activeReport, setActiveReport] = useState<ReportType>(null);
  const [period, setPeriod] = useState("this_month");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["accounts-for-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("id, code, name, account_type, current_balance, is_system, is_contra, parent_account_id")
        .eq("is_active", true)
        .eq("is_system", false)
        .order("code");
      if (error) throw error;
      return data as Account[];
    },
    enabled: !!activeReport,
  });

  const { data: journalEntries } = useQuery({
    queryKey: ["journal-entries-for-reports", period, customStartDate, customEndDate],
    queryFn: async () => {
      let query = supabase
        .from("journal_entries")
        .select(`
          *,
          member:members(full_name, beneficiary_id),
          journal_entry_lines(*, account:accounts(code, name))
        `)
        .eq("status", "posted")
        .order("entry_date", { ascending: false });

      const now = new Date();
      let startDate: Date | undefined;
      let endDate: Date | undefined;

      switch (period) {
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

      if (startDate) {
        query = query.gte("entry_date", format(startDate, "yyyy-MM-dd"));
      }
      if (endDate) {
        query = query.lte("entry_date", format(endDate, "yyyy-MM-dd"));
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: activeReport === "journal_report" || activeReport === "cash_flow",
  });

  const getPeriodLabel = () => {
    const option = periodOptions.find((o) => o.value === period);
    if (period === "custom" && customStartDate && customEndDate) {
      return `${format(customStartDate, "dd MMM yyyy")} - ${format(customEndDate, "dd MMM yyyy")}`;
    }
    return option?.label || "";
  };

  const exportToCSV = (data: any[], filename: string) => {
    const headers = Object.keys(data[0] || {}).join(",");
    const rows = data.map((row) => Object.values(row).join(",")).join("\n");
    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
  };

  const exportReportToPDF = (title: string, tableData: any[][], headers: string[]) => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(10);
    doc.text(`Period: ${getPeriodLabel()}`, 14, 30);
    doc.text(`Generated on: ${format(new Date(), "dd MMM yyyy HH:mm")}`, 14, 36);

    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: 44,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`${title.toLowerCase().replace(/ /g, "-")}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  const renderPeriodSelector = () => (
    <div className="flex flex-wrap gap-3 mb-4 items-center">
      <span className="text-sm text-muted-foreground">Period:</span>
      <Select value={period} onValueChange={setPeriod}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Select Period" />
        </SelectTrigger>
        <SelectContent>
          {periodOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {period === "custom" && (
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn(!customStartDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customStartDate ? format(customStartDate, "dd MMM yyyy") : "Start Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customStartDate}
                onSelect={setCustomStartDate}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground">to</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn(!customEndDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customEndDate ? format(customEndDate, "dd MMM yyyy") : "End Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customEndDate}
                onSelect={setCustomEndDate}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );

  const renderTrialBalance = () => {
    if (!accounts) return null;

    let totalDebit = 0;
    let totalCredit = 0;

    const trialBalanceData = accounts
      .filter((acc) => acc.current_balance !== 0)
      .map((acc) => {
        const isDebitNormal = ["asset", "expense"].includes(acc.account_type);
        const balance = Number(acc.current_balance);
        const debit = isDebitNormal && balance > 0 ? balance : (!isDebitNormal && balance < 0 ? Math.abs(balance) : 0);
        const credit = !isDebitNormal && balance > 0 ? balance : (isDebitNormal && balance < 0 ? Math.abs(balance) : 0);
        
        totalDebit += debit;
        totalCredit += credit;

        return {
          code: acc.code,
          name: acc.name,
          debit,
          credit,
        };
      });

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-lg font-semibold">Trial Balance</h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCSV(trialBalanceData, "trial_balance")}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportReportToPDF(
                "Trial Balance",
                trialBalanceData.map((row) => [
                  row.code,
                  row.name,
                  row.debit > 0 ? `BDT ${row.debit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-",
                  row.credit > 0 ? `BDT ${row.credit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-",
                ]),
                ["Code", "Account", "Debit", "Credit"]
              )}
            >
              <FileText className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>
        {renderPeriodSelector()}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trialBalanceData.map((row) => (
                <TableRow key={row.code}>
                  <TableCell className="font-mono">{row.code}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell className="text-right font-mono">
                    {row.debit > 0 ? `৳${row.debit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-"}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {row.credit > 0 ? `৳${row.credit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <tfoot className="bg-muted font-semibold">
              <tr>
                <td colSpan={2} className="p-2 text-right">Totals:</td>
                <td className="p-2 text-right font-mono">
                  ৳{totalDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
                <td className="p-2 text-right font-mono">
                  ৳{totalCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </Table>
        </div>
      </div>
    );
  };

  const renderBalanceSheet = () => {
    if (!accounts) return null;

    // Separate main accounts and contra accounts
    const mainAccounts = accounts.filter((a) => !a.is_contra);
    const contraAccounts = accounts.filter((a) => a.is_contra);

    // Calculate net balances for main accounts with contra netting
    const getNetBalance = (mainAccount: Account): number => {
      const mainBalance = Number(mainAccount.current_balance);
      // Find contra accounts linked to this main account
      const linkedContras = contraAccounts.filter(
        (c) => c.parent_account_id === mainAccount.id
      );
      const contraTotal = linkedContras.reduce(
        (sum, c) => sum + Number(c.current_balance),
        0
      );
      // Net balance = Main - Contra (contra accounts have opposite normal balance)
      return mainBalance - contraTotal;
    };

    const assets = mainAccounts.filter((a) => a.account_type === "asset");
    const liabilities = mainAccounts.filter((a) => a.account_type === "liability");
    const equity = mainAccounts.filter((a) => a.account_type === "equity");

    // Get linked contra accounts for display
    const getLinkedContras = (mainAccountId: string) => {
      return contraAccounts.filter((c) => c.parent_account_id === mainAccountId);
    };

    const totalAssets = assets.reduce((sum, a) => sum + getNetBalance(a), 0);
    const totalLiabilities = liabilities.reduce((sum, a) => sum + getNetBalance(a), 0);
    const totalEquity = equity.reduce((sum, a) => sum + getNetBalance(a), 0);

    const balanceSheetData = [
      ...assets.map((a) => ({ type: "Asset", name: a.name, amount: getNetBalance(a) })),
      ...liabilities.map((a) => ({ type: "Liability", name: a.name, amount: getNetBalance(a) })),
      ...equity.map((a) => ({ type: "Equity", name: a.name, amount: getNetBalance(a) })),
    ];

    const renderAccountWithContras = (acc: Account) => {
      const linkedContras = getLinkedContras(acc.id);
      const netBalance = getNetBalance(acc);
      const hasContras = linkedContras.length > 0;

      return (
        <div key={acc.id} className="py-1">
          <div className="flex justify-between text-sm">
            <span>{acc.name}</span>
            <span className="font-mono">
              ৳{Number(acc.current_balance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
          {linkedContras.map((contra) => (
            <div key={contra.id} className="flex justify-between text-sm text-muted-foreground pl-4">
              <span className="italic">Less: {contra.name}</span>
              <span className="font-mono">
                (৳{Number(contra.current_balance).toLocaleString("en-IN", { minimumFractionDigits: 2 })})
              </span>
            </div>
          ))}
          {hasContras && (
            <div className="flex justify-between text-sm font-medium pl-4 border-t border-dashed mt-1 pt-1">
              <span>Net {acc.name}</span>
              <span className="font-mono">
                ৳{netBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-lg font-semibold">Balance Sheet</h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCSV(balanceSheetData, "balance_sheet")}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportReportToPDF(
                "Balance Sheet",
                balanceSheetData.map((row) => [
                  row.type,
                  row.name,
                  `BDT ${Number(row.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
                ]),
                ["Type", "Account", "Net Amount"]
              )}
            >
              <FileText className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>
        {renderPeriodSelector()}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Assets
            </h4>
            {assets.map((acc) => renderAccountWithContras(acc))}
            <div className="border-t mt-2 pt-2 flex justify-between font-semibold">
              <span>Total Assets (Net)</span>
              <span className="font-mono">
                ৳{totalAssets.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                Liabilities
              </h4>
              {liabilities.map((acc) => renderAccountWithContras(acc))}
              <div className="border-t mt-2 pt-2 flex justify-between font-semibold">
                <span>Total Liabilities (Net)</span>
                <span className="font-mono">
                  ৳{totalLiabilities.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Wallet className="h-4 w-4 text-green-500" />
                Equity
              </h4>
              {equity.map((acc) => renderAccountWithContras(acc))}
              <div className="border-t mt-2 pt-2 flex justify-between font-semibold">
                <span>Total Equity (Net)</span>
                <span className="font-mono">
                  ৳{totalEquity.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="border rounded-lg p-4 bg-muted">
              <div className="flex justify-between font-semibold">
                <span>Total Liabilities + Equity</span>
                <span className="font-mono">
                  ৳{(totalLiabilities + totalEquity).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderProfitLoss = () => {
    if (!accounts) return null;

    const income = accounts.filter((a) => a.account_type === "income");
    const expenses = accounts.filter((a) => a.account_type === "expense");

    const totalIncome = income.reduce((sum, a) => sum + Number(a.current_balance), 0);
    const totalExpenses = expenses.reduce((sum, a) => sum + Number(a.current_balance), 0);
    const netProfit = totalIncome - totalExpenses;

    const pnlData = [
      ...income.map((a) => ({ type: "Income", name: a.name, amount: a.current_balance })),
      ...expenses.map((a) => ({ type: "Expense", name: a.name, amount: a.current_balance })),
    ];

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-lg font-semibold">Profit & Loss Statement</h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCSV(pnlData, "profit_loss")}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportReportToPDF(
                "Profit & Loss Statement",
                pnlData.map((row) => [
                  row.type,
                  row.name,
                  `BDT ${Number(row.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
                ]),
                ["Type", "Account", "Amount"]
              )}
            >
              <FileText className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>
        {renderPeriodSelector()}
        <div className="space-y-4">
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-3 text-green-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Income
            </h4>
            {income.map((acc) => (
              <div key={acc.id} className="flex justify-between text-sm py-1">
                <span>{acc.name}</span>
                <span className="font-mono">
                  ৳{Number(acc.current_balance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
            <div className="border-t mt-2 pt-2 flex justify-between font-semibold">
              <span>Total Income</span>
              <span className="font-mono text-green-600">
                ৳{totalIncome.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-3 text-red-600 flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Expenses
            </h4>
            {expenses.map((acc) => (
              <div key={acc.id} className="flex justify-between text-sm py-1">
                <span>{acc.name}</span>
                <span className="font-mono">
                  ৳{Number(acc.current_balance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
            <div className="border-t mt-2 pt-2 flex justify-between font-semibold">
              <span>Total Expenses</span>
              <span className="font-mono text-red-600">
                ৳{totalExpenses.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="border rounded-lg p-4 bg-muted">
            <div className="flex justify-between font-semibold text-lg">
              <span>Net {netProfit >= 0 ? "Profit" : "Loss"}</span>
              <span className={`font-mono ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                ৳{Math.abs(netProfit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCashFlow = () => {
    if (!accounts) return null;

    const cashAccounts = accounts.filter((a) => 
      a.account_type === "asset" && 
      (a.name.toLowerCase().includes("cash") || a.name.toLowerCase().includes("bank"))
    );

    const totalCash = cashAccounts.reduce((sum, a) => sum + Number(a.current_balance), 0);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-lg font-semibold">Cash Flow Statement</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>
        {renderPeriodSelector()}
        
        <div className="space-y-4">
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-500" />
              Cash & Bank Accounts
            </h4>
            {cashAccounts.length > 0 ? (
              <>
                {cashAccounts.map((acc) => (
                  <div key={acc.id} className="flex justify-between text-sm py-1">
                    <span>{acc.name}</span>
                    <span className="font-mono">
                      ৳{Number(acc.current_balance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
                <div className="border-t mt-2 pt-2 flex justify-between font-semibold">
                  <span>Total Cash & Bank</span>
                  <span className="font-mono">
                    ৳{totalCash.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">No cash or bank accounts found</p>
            )}
          </div>

          <div className="border rounded-lg p-4 bg-muted">
            <div className="flex justify-between font-semibold text-lg">
              <span>Net Cash Position</span>
              <span className={`font-mono ${totalCash >= 0 ? "text-green-600" : "text-red-600"}`}>
                ৳{totalCash.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderJournalReport = () => {
    if (!journalEntries) return null;

    const totalDebit = journalEntries.reduce((sum, e) => sum + Number(e.total_debit), 0);
    const totalCredit = journalEntries.reduce((sum, e) => sum + Number(e.total_credit), 0);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-lg font-semibold">Journal Report</h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const doc = new jsPDF();
                doc.setFontSize(18);
                doc.text("Journal Report", 14, 22);
                doc.setFontSize(10);
                doc.text(`Period: ${getPeriodLabel()}`, 14, 30);
                doc.text(`Generated on: ${format(new Date(), "dd MMM yyyy HH:mm")}`, 14, 36);

                autoTable(doc, {
                  head: [["Entry #", "Date", "Description", "Member", "Debit", "Credit"]],
                  body: journalEntries.map((e: any) => [
                    e.entry_number,
                    format(new Date(e.entry_date), "dd MMM yyyy"),
                    e.description || "-",
                    e.member?.beneficiary_id || "-",
                    `BDT ${Number(e.total_debit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
                    `BDT ${Number(e.total_credit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
                  ]),
                  startY: 44,
                  styles: { fontSize: 8 },
                  headStyles: { fillColor: [59, 130, 246] },
                });

                doc.save("journal-report.pdf");
              }}
            >
              <FileText className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>
        {renderPeriodSelector()}
        
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entry #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Member</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {journalEntries.map((entry: any) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-mono">{entry.entry_number}</TableCell>
                  <TableCell>{format(new Date(entry.entry_date), "dd MMM yyyy")}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {entry.description || "-"}
                  </TableCell>
                  <TableCell>{entry.member?.beneficiary_id || "-"}</TableCell>
                  <TableCell className="text-right font-mono">
                    ৳{Number(entry.total_debit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    ৳{Number(entry.total_credit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <tfoot className="bg-muted font-semibold">
              <tr>
                <td colSpan={4} className="p-2 text-right">Totals:</td>
                <td className="p-2 text-right font-mono">
                  ৳{totalDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
                <td className="p-2 text-right font-mono">
                  ৳{totalCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </Table>
        </div>
      </div>
    );
  };

  if (!activeReport) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setActiveReport("journal_report")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Journal Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              View all posted journal entries for a period
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setActiveReport("trial_balance")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Trial Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              View all account balances with debits and credits
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setActiveReport("balance_sheet")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Balance Sheet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              View assets, liabilities, and equity
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setActiveReport("pnl")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Profit & Loss
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              View income and expenses summary
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setActiveReport("cash_flow")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Cash Flow Statement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              View cash and bank position
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow border-primary/50 bg-primary/5"
          onClick={() => setActiveReport("custom")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              Custom Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Design your own report with selected accounts and columns
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeReport === "custom") {
    return <CustomReportBuilder onBack={() => setActiveReport(null)} />;
  }

  return (
    <div className="space-y-4">
      <Button variant="outline" onClick={() => setActiveReport(null)}>
        ← Back to Reports
      </Button>
      
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <>
          {activeReport === "journal_report" && renderJournalReport()}
          {activeReport === "trial_balance" && renderTrialBalance()}
          {activeReport === "balance_sheet" && renderBalanceSheet()}
          {activeReport === "pnl" && renderProfitLoss()}
          {activeReport === "cash_flow" && renderCashFlow()}
        </>
      )}
    </div>
  );
}
