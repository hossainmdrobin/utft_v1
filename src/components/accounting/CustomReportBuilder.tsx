import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/mongodb/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  Download, 
  Printer, 
  CalendarIcon, 
  Settings2, 
  Eye,
  Plus,
  X,
  Save,
  FolderOpen,
  Trash2,
  BarChart3,
  PieChart
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
} from "recharts";

type Account = {
  id: string;
  code: string;
  name: string;
  account_type: string;
  current_balance: number;
};

type ReportColumn = {
  id: string;
  label: string;
  type: "code" | "name" | "type" | "balance" | "debit" | "credit";
};

type ReportTemplate = {
  id: string;
  name: string;
  description: string | null;
  config: {
    selectedAccountIds: string[];
    selectedColumns: string[];
    filterByType: string;
    period: string;
    showTotals: boolean;
    groupByType: boolean;
    showChart: boolean;
    chartType: string;
  };
  created_at: string;
};

const availableColumns: ReportColumn[] = [
  { id: "code", label: "Account Code", type: "code" },
  { id: "name", label: "Account Name", type: "name" },
  { id: "type", label: "Account Type", type: "type" },
  { id: "balance", label: "Balance", type: "balance" },
  { id: "debit", label: "Debit", type: "debit" },
  { id: "credit", label: "Credit", type: "credit" },
];

const periodOptions = [
  { value: "all", label: "All Time" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "last_3_months", label: "Last 3 Months" },
  { value: "this_year", label: "This Year" },
  { value: "custom", label: "Custom Period" },
];

const accountTypeLabels: Record<string, string> = {
  asset: "Asset",
  liability: "Liability",
  equity: "Equity",
  income: "Income",
  expense: "Expense",
};

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

interface CustomReportBuilderProps {
  onBack: () => void;
}

export function CustomReportBuilder({ onBack }: CustomReportBuilderProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"configure" | "preview">("configure");
  const [reportName, setReportName] = useState("Custom Report");
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(["code", "name", "balance"]);
  const [filterByType, setFilterByType] = useState<string>("all");
  const [period, setPeriod] = useState("all");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [showTotals, setShowTotals] = useState(true);
  const [groupByType, setGroupByType] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [chartType, setChartType] = useState<"bar" | "pie">("bar");
  const [templateDescription, setTemplateDescription] = useState("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["accounts-for-custom-report"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("id, code, name, account_type, current_balance")
        .eq("is_active", true)
        .eq("is_system", false)
        .order("code");
      if (error) throw error;
      return data as Account[];
    },
  });

  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ["report-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("report_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as ReportTemplate[];
    },
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async () => {
      const config = {
        selectedAccountIds,
        selectedColumns,
        filterByType,
        period,
        showTotals,
        groupByType,
        showChart,
        chartType,
      };
      const { error } = await supabase.from("report_templates").insert({
        name: reportName,
        description: templateDescription || null,
        config,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-templates"] });
      toast.success("Template saved successfully");
      setSaveDialogOpen(false);
      setTemplateDescription("");
    },
    onError: (error) => {
      toast.error("Failed to save template: " + error.message);
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("report_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-templates"] });
      toast.success("Template deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete template: " + error.message);
    },
  });

  const loadTemplate = (template: ReportTemplate) => {
    const config = template.config;
    setReportName(template.name);
    setSelectedAccountIds(config.selectedAccountIds || []);
    setSelectedColumns(config.selectedColumns || ["code", "name", "balance"]);
    setFilterByType(config.filterByType || "all");
    setPeriod(config.period || "all");
    setShowTotals(config.showTotals ?? true);
    setGroupByType(config.groupByType ?? false);
    setShowChart(config.showChart ?? false);
    setChartType(config.chartType as "bar" | "pie" || "bar");
    setLoadDialogOpen(false);
    toast.success(`Loaded template: ${template.name}`);
  };

  const filteredAccounts = useMemo(() => {
    if (!accounts) return [];
    if (filterByType === "all") return accounts;
    return accounts.filter((a) => a.account_type === filterByType);
  }, [accounts, filterByType]);

  const selectedAccounts = useMemo(() => {
    if (!accounts) return [];
    if (selectedAccountIds.length === 0) return filteredAccounts;
    return accounts.filter((a) => selectedAccountIds.includes(a.id));
  }, [accounts, selectedAccountIds, filteredAccounts]);

  const reportData = useMemo(() => {
    if (groupByType) {
      const grouped: Record<string, Account[]> = {};
      selectedAccounts.forEach((acc) => {
        if (!grouped[acc.account_type]) {
          grouped[acc.account_type] = [];
        }
        grouped[acc.account_type].push(acc);
      });
      return grouped;
    }
    return { all: selectedAccounts };
  }, [selectedAccounts, groupByType]);

  const totals = useMemo(() => {
    let totalBalance = 0;
    let totalDebit = 0;
    let totalCredit = 0;

    selectedAccounts.forEach((acc) => {
      const balance = Number(acc.current_balance);
      totalBalance += balance;
      
      const isDebitNormal = ["asset", "expense"].includes(acc.account_type);
      if (isDebitNormal && balance > 0) {
        totalDebit += balance;
      } else if (!isDebitNormal && balance > 0) {
        totalCredit += balance;
      } else if (isDebitNormal && balance < 0) {
        totalCredit += Math.abs(balance);
      } else {
        totalDebit += Math.abs(balance);
      }
    });

    return { totalBalance, totalDebit, totalCredit };
  }, [selectedAccounts]);

  const chartData = useMemo(() => {
    if (groupByType) {
      return Object.entries(reportData).map(([type, accounts]) => ({
        name: accountTypeLabels[type] || type,
        value: accounts.reduce((sum, acc) => sum + Math.abs(Number(acc.current_balance)), 0),
        type,
      }));
    }
    return selectedAccounts.slice(0, 10).map((acc) => ({
      name: acc.code,
      fullName: acc.name,
      value: Math.abs(Number(acc.current_balance)),
      type: acc.account_type,
    }));
  }, [reportData, selectedAccounts, groupByType]);

  const toggleAccount = (accountId: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId]
    );
  };

  const selectAllAccounts = () => {
    setSelectedAccountIds(filteredAccounts.map((a) => a.id));
  };

  const clearSelection = () => {
    setSelectedAccountIds([]);
  };

  const toggleColumn = (columnId: string) => {
    setSelectedColumns((prev) =>
      prev.includes(columnId)
        ? prev.filter((id) => id !== columnId)
        : [...prev, columnId]
    );
  };

  const getPeriodLabel = () => {
    const option = periodOptions.find((o) => o.value === period);
    if (period === "custom" && customStartDate && customEndDate) {
      return `${format(customStartDate, "dd MMM yyyy")} - ${format(customEndDate, "dd MMM yyyy")}`;
    }
    return option?.label || "All Time";
  };

  const formatCurrency = (amount: number) => {
    return `৳${amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  };

  const getColumnValue = (account: Account, columnType: string) => {
    const balance = Number(account.current_balance);
    const isDebitNormal = ["asset", "expense"].includes(account.account_type);

    switch (columnType) {
      case "code":
        return account.code;
      case "name":
        return account.name;
      case "type":
        return accountTypeLabels[account.account_type] || account.account_type;
      case "balance":
        return formatCurrency(balance);
      case "debit":
        const debit = isDebitNormal && balance > 0 ? balance : (!isDebitNormal && balance < 0 ? Math.abs(balance) : 0);
        return debit > 0 ? formatCurrency(debit) : "-";
      case "credit":
        const credit = !isDebitNormal && balance > 0 ? balance : (isDebitNormal && balance < 0 ? Math.abs(balance) : 0);
        return credit > 0 ? formatCurrency(credit) : "-";
      default:
        return "-";
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text(reportName, 14, 22);
    doc.setFontSize(10);
    doc.text(`Period: ${getPeriodLabel()}`, 14, 30);
    doc.text(`Generated on: ${format(new Date(), "dd MMM yyyy HH:mm")}`, 14, 36);

    const headers = selectedColumns.map((colId) => {
      const col = availableColumns.find((c) => c.id === colId);
      return col?.label || colId;
    });

    const tableData = selectedAccounts.map((acc) =>
      selectedColumns.map((colId) => {
        const col = availableColumns.find((c) => c.id === colId);
        return getColumnValue(acc, col?.type || "");
      })
    );

    if (showTotals) {
      const totalsRow = selectedColumns.map((colId) => {
        if (colId === "code") return "TOTAL";
        if (colId === "balance") return formatCurrency(totals.totalBalance);
        if (colId === "debit") return formatCurrency(totals.totalDebit);
        if (colId === "credit") return formatCurrency(totals.totalCredit);
        return "";
      });
      tableData.push(totalsRow);
    }

    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: 44,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`${reportName.toLowerCase().replace(/ /g, "-")}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={onBack}>
          ← Back to Reports
        </Button>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (step === "configure") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Button variant="outline" onClick={onBack}>
            ← Back to Reports
          </Button>
          <div className="flex gap-2 flex-wrap">
            <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Load Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Load Report Template</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {templatesLoading ? (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : templates && templates.length > 0 ? (
                    templates.map((template) => (
                      <div
                        key={template.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 cursor-pointer" onClick={() => loadTemplate(template)}>
                          <p className="font-medium">{template.name}</p>
                          {template.description && (
                            <p className="text-sm text-muted-foreground">{template.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(template.created_at), "dd MMM yyyy")}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteTemplateMutation.mutate(template.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-4">
                      No saved templates yet
                    </p>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Save className="h-4 w-4 mr-2" />
                  Save Template
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Report Template</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Template Name</Label>
                    <Input
                      value={reportName}
                      onChange={(e) => setReportName(e.target.value)}
                      placeholder="Enter template name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description (optional)</Label>
                    <Textarea
                      value={templateDescription}
                      onChange={(e) => setTemplateDescription(e.target.value)}
                      placeholder="Enter a description for this template"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button 
                    onClick={() => saveTemplateMutation.mutate()}
                    disabled={!reportName.trim() || saveTemplateMutation.isPending}
                  >
                    {saveTemplateMutation.isPending ? "Saving..." : "Save Template"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button onClick={() => setStep("preview")} disabled={selectedColumns.length === 0}>
              <Eye className="h-4 w-4 mr-2" />
              Preview Report
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Report Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Report Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Report Name</Label>
                <Input
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  placeholder="Enter report name"
                />
              </div>

              <div className="space-y-2">
                <Label>Period</Label>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger>
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
              </div>

              {period === "custom" && (
                <div className="flex items-center gap-2 flex-wrap">
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

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showTotals"
                  checked={showTotals}
                  onCheckedChange={(checked) => setShowTotals(checked as boolean)}
                />
                <Label htmlFor="showTotals">Show Totals Row</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="groupByType"
                  checked={groupByType}
                  onCheckedChange={(checked) => setGroupByType(checked as boolean)}
                />
                <Label htmlFor="groupByType">Group by Account Type</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showChart"
                  checked={showChart}
                  onCheckedChange={(checked) => setShowChart(checked as boolean)}
                />
                <Label htmlFor="showChart">Show Chart Visualization</Label>
              </div>

              {showChart && (
                <div className="space-y-2 pl-6">
                  <Label>Chart Type</Label>
                  <Select value={chartType} onValueChange={(v) => setChartType(v as "bar" | "pie")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bar">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-4 w-4" />
                          Bar Chart
                        </div>
                      </SelectItem>
                      <SelectItem value="pie">
                        <div className="flex items-center gap-2">
                          <PieChart className="h-4 w-4" />
                          Pie Chart
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Column Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Report Columns</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {availableColumns.map((col) => (
                <div key={col.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={col.id}
                    checked={selectedColumns.includes(col.id)}
                    onCheckedChange={() => toggleColumn(col.id)}
                  />
                  <Label htmlFor={col.id}>{col.label}</Label>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Account Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Select Accounts</span>
              <div className="flex gap-2">
                <Select value={filterByType} onValueChange={setFilterByType}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Filter by Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="asset">Assets</SelectItem>
                    <SelectItem value="liability">Liabilities</SelectItem>
                    <SelectItem value="equity">Equity</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expenses</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={selectAllAccounts}>
                  <Plus className="h-4 w-4 mr-1" />
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {selectedAccountIds.length === 0 
                ? "All accounts will be included. Select specific accounts to filter."
                : `${selectedAccountIds.length} account(s) selected`}
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[400px] overflow-y-auto">
              {filteredAccounts?.map((account) => (
                <div
                  key={account.id}
                  className={cn(
                    "flex items-center space-x-2 p-2 rounded-md border cursor-pointer transition-colors",
                    selectedAccountIds.includes(account.id)
                      ? "bg-primary/10 border-primary"
                      : "hover:bg-muted"
                  )}
                  onClick={() => toggleAccount(account.id)}
                >
                  <Checkbox
                    checked={selectedAccountIds.includes(account.id)}
                    onCheckedChange={() => toggleAccount(account.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{account.code} - {account.name}</p>
                    <Badge variant="outline" className="text-xs">
                      {accountTypeLabels[account.account_type]}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Preview Step
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setStep("configure")}>
            ← Back to Configure
          </Button>
          <h3 className="text-lg font-semibold">{reportName}</h3>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportToPDF}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Period: {getPeriodLabel()} | {selectedAccounts.length} accounts
      </p>

      {/* Chart Visualization */}
      {showChart && chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {chartType === "bar" ? <BarChart3 className="h-5 w-5" /> : <PieChart className="h-5 w-5" />}
              Chart View
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {chartType === "bar" ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 12 }}
                      className="fill-muted-foreground"
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`}
                      className="fill-muted-foreground"
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-background border rounded-lg p-2 shadow-lg">
                              <p className="font-medium">{data.fullName || data.name}</p>
                              <p className="text-primary">{formatCurrency(data.value)}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-background border rounded-lg p-2 shadow-lg">
                              <p className="font-medium">{data.fullName || data.name}</p>
                              <p className="text-primary">{formatCurrency(data.value)}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {Object.entries(reportData).map(([groupKey, groupAccounts]) => (
        <div key={groupKey} className="space-y-2">
          {groupByType && groupKey !== "all" && (
            <h4 className="font-semibold text-primary">
              {accountTypeLabels[groupKey] || groupKey}
            </h4>
          )}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  {selectedColumns.map((colId) => {
                    const col = availableColumns.find((c) => c.id === colId);
                    return (
                      <TableHead
                        key={colId}
                        className={cn(
                          ["balance", "debit", "credit"].includes(colId) && "text-right"
                        )}
                      >
                        {col?.label}
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupAccounts.map((account) => (
                  <TableRow key={account.id}>
                    {selectedColumns.map((colId) => {
                      const col = availableColumns.find((c) => c.id === colId);
                      return (
                        <TableCell
                          key={colId}
                          className={cn(
                            ["balance", "debit", "credit"].includes(colId) && "text-right font-mono",
                            colId === "code" && "font-mono"
                          )}
                        >
                          {getColumnValue(account, col?.type || "")}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
              {showTotals && !groupByType && (
                <tfoot className="bg-muted font-semibold">
                  <tr>
                    {selectedColumns.map((colId, idx) => (
                      <td
                        key={colId}
                        className={cn(
                          "p-2",
                          ["balance", "debit", "credit"].includes(colId) && "text-right font-mono"
                        )}
                      >
                        {idx === 0 && "TOTAL"}
                        {colId === "balance" && formatCurrency(totals.totalBalance)}
                        {colId === "debit" && formatCurrency(totals.totalDebit)}
                        {colId === "credit" && formatCurrency(totals.totalCredit)}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </Table>
          </div>
        </div>
      ))}

      {showTotals && groupByType && (
        <div className="border rounded-lg p-4 bg-muted">
          <div className="flex justify-between font-semibold">
            <span>Grand Total</span>
            <div className="space-x-4">
              {selectedColumns.includes("balance") && (
                <span className="font-mono">Balance: {formatCurrency(totals.totalBalance)}</span>
              )}
              {selectedColumns.includes("debit") && (
                <span className="font-mono">Debit: {formatCurrency(totals.totalDebit)}</span>
              )}
              {selectedColumns.includes("credit") && (
                <span className="font-mono">Credit: {formatCurrency(totals.totalCredit)}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
