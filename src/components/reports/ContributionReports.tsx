import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileText, Printer, TrendingUp, TrendingDown, AlertTriangle, DollarSign } from "lucide-react";
import { format, subMonths } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { DonationStatusBadge } from "@/components/members/PaymentStatusBadge";

type ReportType = "monthly_summary" | "overdue_payments" | "fine_summary" | "member_history" | null;

const periodOptions = [
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "last_3_months", label: "Last 3 Months" },
  { value: "last_6_months", label: "Last 6 Months" },
  { value: "this_year", label: "This Year" },
];

export function ContributionReports() {
  const [activeReport, setActiveReport] = useState<ReportType>(null);
  const [period, setPeriod] = useState("this_month");

  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;
    let endDate = now;

    switch (period) {
      case "this_month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "last_month":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case "last_3_months":
        startDate = subMonths(now, 3);
        break;
      case "last_6_months":
        startDate = subMonths(now, 6);
        break;
      case "this_year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return { startDate, endDate };
  };

  // Monthly Donations Summary
  const { data: monthlySummary, isLoading: loadingMonthly } = useQuery({
    queryKey: ["monthly-donations-summary", period],
    queryFn: async () => {
      const { startDate, endDate } = getDateRange();
      const startYear = startDate.getFullYear();
      const startMonth = startDate.getMonth() + 1;
      const endYear = endDate.getFullYear();
      const endMonth = endDate.getMonth() + 1;

      const { data, error } = await supabase
        .from("monthly_donations")
        .select(`
          *,
          member:members(full_name, beneficiary_id)
        `)
        .gte("year", startYear)
        .lte("year", endYear)
        .order("year", { ascending: false })
        .order("month", { ascending: false });

      if (error) throw error;

      // Filter by month range
      return (data || []).filter((d) => {
        const dateNum = d.year * 12 + d.month;
        const startNum = startYear * 12 + startMonth;
        const endNum = endYear * 12 + endMonth;
        return dateNum >= startNum && dateNum <= endNum;
      });
    },
    enabled: activeReport === "monthly_summary",
  });

  // Overdue Payments
  const { data: overduePayments, isLoading: loadingOverdue } = useQuery({
    queryKey: ["overdue-payments"],
    queryFn: async () => {
      const { data: donations, error: dError } = await supabase
        .from("monthly_donations")
        .select(`
          *,
          member:members(full_name, beneficiary_id)
        `)
        .eq("status", "overdue")
        .order("due_date", { ascending: true });

      if (dError) throw dError;

      const { data: charges, error: cError } = await supabase
        .from("member_charges")
        .select(`
          *,
          member:members(full_name, beneficiary_id)
        `)
        .eq("status", "overdue")
        .order("due_date", { ascending: true });

      if (cError) throw cError;

      return {
        donations: donations || [],
        charges: charges || [],
      };
    },
    enabled: activeReport === "overdue_payments",
  });

  // Fine Summary
  const { data: fineSummary, isLoading: loadingFines } = useQuery({
    queryKey: ["fine-summary", period],
    queryFn: async () => {
      const { startDate } = getDateRange();

      const { data, error } = await supabase
        .from("fine_transactions")
        .select(`
          *,
          member:members(full_name, beneficiary_id),
          fine_rule:fine_rules(name)
        `)
        .gte("applied_date", format(startDate, "yyyy-MM-dd"))
        .order("applied_date", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: activeReport === "fine_summary",
  });

  // Summary stats
  const { data: summaryStats, isLoading: loadingStats } = useQuery({
    queryKey: ["contribution-stats", period],
    queryFn: async () => {
      const { startDate, endDate } = getDateRange();
      const startYear = startDate.getFullYear();
      const startMonth = startDate.getMonth() + 1;
      const endYear = endDate.getFullYear();
      const endMonth = endDate.getMonth() + 1;

      const { data: donations } = await supabase
        .from("monthly_donations")
        .select("amount, paid_amount, status")
        .gte("year", startYear)
        .lte("year", endYear);

      const { data: fines } = await supabase
        .from("fine_transactions")
        .select("fine_amount, paid_amount, status")
        .gte("applied_date", format(startDate, "yyyy-MM-dd"));

      const filteredDonations = (donations || []).filter((d: any) => {
        const dateNum = d.year * 12 + d.month;
        const startNum = startYear * 12 + startMonth;
        const endNum = endYear * 12 + endMonth;
        return dateNum >= startNum && dateNum <= endNum;
      });

      const totalContributions = filteredDonations.reduce((sum: number, d: any) => sum + Number(d.amount), 0);
      const collectedContributions = filteredDonations.reduce((sum: number, d: any) => sum + Number(d.paid_amount), 0);
      const overdueCount = filteredDonations.filter((d: any) => d.status === "overdue").length;

      const totalFines = (fines || []).reduce((sum: number, f: any) => sum + Number(f.fine_amount), 0);
      const collectedFines = (fines || []).reduce((sum: number, f: any) => sum + Number(f.paid_amount), 0);

      return {
        totalContributions,
        collectedContributions,
        pendingContributions: totalContributions - collectedContributions,
        overdueCount,
        totalFines,
        collectedFines,
        pendingFines: totalFines - collectedFines,
      };
    },
    enabled: !!activeReport,
  });

  const exportToCSV = (data: any[], filename: string) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map((row) => Object.values(row).map(v => 
      typeof v === "object" ? JSON.stringify(v) : v
    ).join(",")).join("\n");
    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
  };

  const exportToPDF = (title: string, tableData: string[][], headers: string[]) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(10);
    doc.text(`Period: ${periodOptions.find(p => p.value === period)?.label}`, 14, 30);
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

  const renderPeriodSelector = () => (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-sm text-muted-foreground">Period:</span>
      <Select value={period} onValueChange={setPeriod}>
        <SelectTrigger className="w-[160px]">
          <SelectValue />
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
  );

  const renderSummaryCards = () => {
    if (loadingStats) {
      return (
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      );
    }

    return (
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Collected</p>
                <p className="text-xl font-bold">
                  ৳{(summaryStats?.collectedContributions || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-xl font-bold">
                  ৳{(summaryStats?.pendingContributions || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-xl font-bold">{summaryStats?.overdueCount || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Fines Collected</p>
                <p className="text-xl font-bold">
                  ৳{(summaryStats?.collectedFines || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderMonthlySummary = () => {
    if (loadingMonthly) {
      return <Skeleton className="h-64" />;
    }

    const data = monthlySummary || [];
    const csvData = data.map((d: any) => ({
      Month: format(new Date(d.year, d.month - 1), "MMMM yyyy"),
      Member: d.member?.full_name || "Unknown",
      BeneficiaryID: d.member?.beneficiary_id || "-",
      Amount: d.amount,
      Paid: d.paid_amount,
      Due: Number(d.amount) - Number(d.paid_amount),
      Status: d.status,
    }));

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Monthly Contributions Summary</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportToCSV(csvData, "monthly_contributions")}>
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToPDF(
                "Monthly Contributions",
                csvData.map((r: any) => [r.Month, r.Member, r.BeneficiaryID, `৳${r.Amount}`, `৳${r.Paid}`, `৳${r.Due}`, r.Status]),
                ["Month", "Member", "ID", "Amount", "Paid", "Due", "Status"]
              )}
            >
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>
        {renderPeriodSelector()}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>ID</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Due</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No data for this period
                  </TableCell>
                </TableRow>
              ) : (
                data.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell>{format(new Date(d.year, d.month - 1), "MMM yyyy")}</TableCell>
                    <TableCell>{d.member?.full_name}</TableCell>
                    <TableCell className="font-mono text-sm">{d.member?.beneficiary_id}</TableCell>
                    <TableCell className="text-right">৳{Number(d.amount).toLocaleString()}</TableCell>
                    <TableCell className="text-right text-green-600">৳{Number(d.paid_amount).toLocaleString()}</TableCell>
                    <TableCell className="text-right text-red-600">
                      ৳{(Number(d.amount) - Number(d.paid_amount)).toLocaleString()}
                    </TableCell>
                    <TableCell><DonationStatusBadge status={d.status} /></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  const renderOverduePayments = () => {
    if (loadingOverdue) {
      return <Skeleton className="h-64" />;
    }

    const donations = overduePayments?.donations || [];
    const charges = overduePayments?.charges || [];

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Overdue Payments</h3>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Overdue Contributions ({donations.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Amount Due</TableHead>
                  <TableHead>Days Overdue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {donations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                      No overdue contributions
                    </TableCell>
                  </TableRow>
                ) : (
                  donations.map((d: any) => {
                    const daysOverdue = d.due_date
                      ? Math.floor((Date.now() - new Date(d.due_date).getTime()) / (1000 * 60 * 60 * 24))
                      : 0;
                    return (
                      <TableRow key={d.id}>
                        <TableCell>{d.member?.full_name}</TableCell>
                        <TableCell>{format(new Date(d.year, d.month - 1), "MMM yyyy")}</TableCell>
                        <TableCell>{d.due_date ? format(new Date(d.due_date), "dd MMM yyyy") : "-"}</TableCell>
                        <TableCell className="text-right text-red-600">
                          ৳{(Number(d.amount) - Number(d.paid_amount)).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive">{daysOverdue} days</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Overdue Charges ({charges.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Amount Due</TableHead>
                  <TableHead>Days Overdue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {charges.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                      No overdue charges
                    </TableCell>
                  </TableRow>
                ) : (
                  charges.map((c: any) => {
                    const daysOverdue = c.due_date
                      ? Math.floor((Date.now() - new Date(c.due_date).getTime()) / (1000 * 60 * 60 * 24))
                      : 0;
                    return (
                      <TableRow key={c.id}>
                        <TableCell>{c.member?.full_name}</TableCell>
                        <TableCell className="capitalize">{c.charge_type.replace(/_/g, " ")}</TableCell>
                        <TableCell>{c.due_date ? format(new Date(c.due_date), "dd MMM yyyy") : "-"}</TableCell>
                        <TableCell className="text-right text-red-600">
                          ৳{(Number(c.amount) - Number(c.paid_amount)).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive">{daysOverdue} days</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderFineSummary = () => {
    if (loadingFines) {
      return <Skeleton className="h-64" />;
    }

    const data = fineSummary || [];

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Fine Summary</h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCSV(
                data.map((f: any) => ({
                  Member: f.member?.full_name,
                  AppliedDate: f.applied_date,
                  Reason: f.reason,
                  FineAmount: f.fine_amount,
                  Paid: f.paid_amount,
                  Status: f.status,
                })),
                "fine_summary"
              )}
            >
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
          </div>
        </div>
        {renderPeriodSelector()}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Applied Date</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Fine Amount</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No fines for this period
                  </TableCell>
                </TableRow>
              ) : (
                data.map((f: any) => (
                  <TableRow key={f.id}>
                    <TableCell>{f.member?.full_name}</TableCell>
                    <TableCell>{format(new Date(f.applied_date), "dd MMM yyyy")}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{f.reason}</TableCell>
                    <TableCell className="text-right">৳{Number(f.fine_amount).toLocaleString()}</TableCell>
                    <TableCell className="text-right text-green-600">৳{Number(f.paid_amount).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={f.status === "paid" ? "default" : f.status === "waived" ? "secondary" : "destructive"}>
                        {f.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  if (!activeReport) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Contribution Reports</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => setActiveReport("monthly_summary")}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Monthly Contributions
                </CardTitle>
                <CardDescription>
                  Summary of monthly contributions by member
                </CardDescription>
              </CardHeader>
            </Card>

            <Card
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => setActiveReport("overdue_payments")}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Overdue Payments
                </CardTitle>
                <CardDescription>
                  View all overdue contributions and charges
                </CardDescription>
              </CardHeader>
            </Card>

            <Card
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => setActiveReport("fine_summary")}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-purple-500" />
                  Fine Summary
                </CardTitle>
                <CardDescription>
                  Summary of all fines applied and collected
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => setActiveReport(null)}>
        ← Back to Reports
      </Button>

      {renderSummaryCards()}

      {activeReport === "monthly_summary" && renderMonthlySummary()}
      {activeReport === "overdue_payments" && renderOverduePayments()}
      {activeReport === "fine_summary" && renderFineSummary()}
    </div>
  );
}
