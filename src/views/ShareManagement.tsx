"use client";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Calculator, Loader2, Filter, X, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/mongodb/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { MarkAsPaidDialog } from "@/components/shares/MarkAsPaidDialog";
import { SharePriceDialog } from "@/components/shares/SharePriceDialog";
import { Skeleton } from "@/components/ui/skeleton";

interface ShareReceivable {
  id: string;
  member_id: string;
  year: number;
  month: number;
  share_quantity: number;
  share_price: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number | null;
  status: string;
  payment_date: string | null;
  due_date: string | null;
  member?: {
    id: string;
    full_name: string;
    beneficiary_id: string | null;
    share_quantity: number;
  };
}

export default function ShareManagement() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedReceivable, setSelectedReceivable] = useState<ShareReceivable | null>(null);
  const [isMarkAsPaidOpen, setIsMarkAsPaidOpen] = useState(false);
  
  // Filter states
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Fetch share price from trust settings
  const { data: sharePrice = 100 } = useQuery({
    queryKey: ["share-price"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trust_settings")
        .select("value")
        .eq("key", "share_price")
        .maybeSingle();
      if (error) throw error;
      const value = data?.value as { amount?: number } | null;
      return value?.amount || 100;
    },
  });

  // Fetch all active members
  const { data: members = [] } = useQuery({
    queryKey: ["active-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name, beneficiary_id, share_quantity")
        .eq("status", "active")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch share receivables
  const { data: receivables = [], isLoading: isLoadingReceivables } = useQuery({
    queryKey: ["share-receivables"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("share_receivables")
        .select("*")
        .order("year", { ascending: false })
        .order("month", { ascending: false });
      if (error) throw error;
      return data as ShareReceivable[];
    },
  });

  // Get unique years and months for filter dropdowns
  const filterOptions = useMemo(() => {
    const years = [...new Set(receivables.map((r) => r.year))].sort((a, b) => b - a);
    const months = [...new Set(receivables.map((r) => r.month))].sort((a, b) => a - b);
    return { years, months };
  }, [receivables]);

  // Filter receivables based on selected filters
  const filteredReceivables = useMemo(() => {
    return receivables.filter((r) => {
      if (filterYear !== "all" && r.year !== parseInt(filterYear)) return false;
      if (filterMonth !== "all" && r.month !== parseInt(filterMonth)) return false;
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      return true;
    });
  }, [receivables, filterYear, filterMonth, filterStatus]);

  const clearFilters = () => {
    setFilterYear("all");
    setFilterMonth("all");
    setFilterStatus("all");
  };

  const hasActiveFilters = filterYear !== "all" || filterMonth !== "all" || filterStatus !== "all";

  // Calculate share receivables mutation
  const calculateReceivables = useMutation({
    mutationFn: async () => {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;

      // Check for existing receivables this month
      const { data: existing } = await supabase
        .from("share_receivables")
        .select("id, member_id")
        .eq("year", currentYear)
        .eq("month", currentMonth);

      const existingMemberIds = new Set(existing?.map((r) => r.member_id) || []);

      // Filter members that don't have receivables for this month
      const membersToCreate = members.filter(
        (m) => m.share_quantity > 0 && !existingMemberIds.has(m.id)
      );

      if (membersToCreate.length === 0) {
        toast.info("All members already have receivables for this month");
        return;
      }

      // Create receivables for members
      const newReceivables = membersToCreate.map((member) => ({
        member_id: member.id,
        year: currentYear,
        month: currentMonth,
        share_quantity: member.share_quantity,
        share_price: sharePrice,
        total_amount: member.share_quantity * sharePrice,
        paid_amount: 0,
        status: "pending",
        due_date: new Date(currentYear, currentMonth - 1, 10).toISOString().split("T")[0],
      }));

      const { error } = await supabase.from("share_receivables").insert(newReceivables);
      if (error) throw error;

      return newReceivables.length;
    },
    onSuccess: (count) => {
      if (count) {
        toast.success(`Created ${count} share receivables for this month`);
      }
      queryClient.invalidateQueries({ queryKey: ["share-receivables"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to calculate receivables");
    },
  });

  // Get member details for a receivable
  const getReceivableWithMember = (receivable: ShareReceivable): ShareReceivable => {
    const member = members.find((m) => m.id === receivable.member_id);
    return {
      ...receivable,
      member: member || undefined,
    };
  };

  const handleMarkAsPaid = (receivable: ShareReceivable) => {
    setSelectedReceivable(getReceivableWithMember(receivable));
    setIsMarkAsPaidOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500 hover:bg-green-600">Paid</Badge>;
      case "partial":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Partial</Badge>;
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const getMonthName = (month: number) => {
    return format(new Date(2024, month - 1, 1), "MMMM");
  };

  // Calculate totals (from filtered receivables)
  const totalReceivable = filteredReceivables.reduce((sum, r) => sum + Number(r.total_amount), 0);
  const totalPaid = filteredReceivables.reduce((sum, r) => sum + Number(r.paid_amount), 0);
  const totalRemaining = totalReceivable - totalPaid;

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Share Management</h2>
            <p className="text-muted-foreground mt-1">
              Manage member share receivables and payments • Share Price: ৳{sharePrice.toLocaleString()}/share
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <SharePriceDialog
              currentPrice={sharePrice}
              onSuccess={() => queryClient.invalidateQueries({ queryKey: ["share-price"] })}
            />
            <Button
              variant="outline"
              onClick={() => router.push("/share-management/bulk-payment")}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Bulk Payment
            </Button>
            <Button
              onClick={() => calculateReceivables.mutate()}
              disabled={calculateReceivables.isPending}
            >
              {calculateReceivables.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Calculator className="mr-2 h-4 w-4" />
              )}
              Calculate Share Receivables
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Receivable
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">৳{totalReceivable.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Paid
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ৳{totalPaid.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Remaining Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                ৳{totalRemaining.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </CardTitle>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Year</label>
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {filterOptions.years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Month</label>
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Months" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {filterOptions.months.map((month) => (
                      <SelectItem key={month} value={month.toString()}>
                        {format(new Date(2024, month - 1, 1), "MMMM")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Payment Status</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Receivables Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Share Receivables
              {hasActiveFilters && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({filteredReceivables.length} of {receivables.length} records)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingReceivables ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredReceivables.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {receivables.length === 0 ? (
                  <p>No receivables found. Click "Calculate Share Receivables" to generate.</p>
                ) : (
                  <p>No receivables match the selected filters.</p>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Shares</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReceivables.map((receivable) => {
                    const member = members.find((m) => m.id === receivable.member_id);
                    const remaining =
                      receivable.remaining_amount ??
                      Number(receivable.total_amount) - Number(receivable.paid_amount);
                    return (
                      <TableRow key={receivable.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{member?.full_name || "Unknown"}</p>
                            <p className="text-sm text-muted-foreground">
                              {member?.beneficiary_id || "-"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getMonthName(receivable.month)} {receivable.year}
                        </TableCell>
                        <TableCell className="text-right">{receivable.share_quantity}</TableCell>
                        <TableCell className="text-right">
                          ৳{Number(receivable.total_amount).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          ৳{Number(receivable.paid_amount).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-orange-600">
                          ৳{remaining.toLocaleString()}
                        </TableCell>
                        <TableCell>{getStatusBadge(receivable.status)}</TableCell>
                        <TableCell className="text-right">
                          {receivable.status !== "paid" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMarkAsPaid(receivable)}
                            >
                              Mark as Paid
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mark as Paid Dialog */}
      {selectedReceivable && (
        <MarkAsPaidDialog
          open={isMarkAsPaidOpen}
          onOpenChange={setIsMarkAsPaidOpen}
          receivable={selectedReceivable}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["share-receivables"] });
            setSelectedReceivable(null);
          }}
        />
      )}
    </>
  );
}

