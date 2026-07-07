"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, CheckCircle2, Loader2, ArrowLeft, Lock, Unlock } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAdmin } from "@/hooks/use-admin";
import { BulkPaymentConfirmDialog } from "@/components/shares/BulkPaymentConfirmDialog";

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
}

interface Member {
  id: string;
  full_name: string;
  beneficiary_id: string | null;
  share_quantity: number;
}

export default function BulkSharePayment() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAdmin } = useAdmin();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [paymentAmounts, setPaymentAmounts] = useState<Map<string, number>>(new Map());
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [previousMonthUnlocked, setPreviousMonthUnlocked] = useState(false);

  // Filter states
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Get current month info for locking logic
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

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
      return data as Member[];
    },
  });

  // Fetch unpaid share receivables - include overdue status as well
  const { data: receivables = [], isLoading } = useQuery({
    queryKey: ["unpaid-share-receivables"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("share_receivables")
        .select("*")
        .in("status", ["pending", "partial", "overdue"])
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

  // Filter receivables based on selected filters and lock status
  const filteredReceivables = useMemo(() => {
    return receivables.filter((r) => {
      if (filterYear !== "all" && r.year !== parseInt(filterYear)) return false;
      if (filterMonth !== "all" && r.month !== parseInt(filterMonth)) return false;
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      
      // Lock previous months unless admin has unlocked them
      const isPreviousMonth = r.year < currentYear || (r.year === currentYear && r.month < currentMonth);
      if (isPreviousMonth && !previousMonthUnlocked) return false;
      
      return true;
    });
  }, [receivables, filterYear, filterMonth, filterStatus, previousMonthUnlocked, currentYear, currentMonth]);

  // Calculate counts for info display
  const previousMonthCount = useMemo(() => {
    return receivables.filter((r) => {
      const isPreviousMonth = r.year < currentYear || (r.year === currentYear && r.month < currentMonth);
      return isPreviousMonth;
    }).length;
  }, [receivables, currentYear, currentMonth]);

  const getMember = (memberId: string) => members.find((m) => m.id === memberId);

  const getMonthName = (month: number) => {
    return format(new Date(2024, month - 1, 1), "MMMM");
  };

  const getRemainingAmount = (receivable: ShareReceivable) => {
    return receivable.remaining_amount ?? 
      Number(receivable.total_amount) - Number(receivable.paid_amount);
  };

  const toggleSelection = (id: string, receivable: ShareReceivable) => {
    const newSelectedIds = new Set(selectedIds);
    const newPaymentAmounts = new Map(paymentAmounts);
    
    if (newSelectedIds.has(id)) {
      newSelectedIds.delete(id);
      newPaymentAmounts.delete(id);
    } else {
      newSelectedIds.add(id);
      newPaymentAmounts.set(id, getRemainingAmount(receivable));
    }
    
    setSelectedIds(newSelectedIds);
    setPaymentAmounts(newPaymentAmounts);
  };

  const selectAll = () => {
    const newSelectedIds = new Set<string>();
    const newPaymentAmounts = new Map<string, number>();
    
    filteredReceivables.forEach((r) => {
      newSelectedIds.add(r.id);
      newPaymentAmounts.set(r.id, getRemainingAmount(r));
    });
    
    setSelectedIds(newSelectedIds);
    setPaymentAmounts(newPaymentAmounts);
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
    setPaymentAmounts(new Map());
  };

  const updatePaymentAmount = (id: string, amount: number, maxAmount: number) => {
    const newPaymentAmounts = new Map(paymentAmounts);
    const clampedAmount = Math.min(Math.max(0, amount), maxAmount);
    newPaymentAmounts.set(id, clampedAmount);
    setPaymentAmounts(newPaymentAmounts);
  };

  const setFullPayment = (id: string, maxAmount: number) => {
    const newPaymentAmounts = new Map(paymentAmounts);
    newPaymentAmounts.set(id, maxAmount);
    setPaymentAmounts(newPaymentAmounts);
  };

  const selectedReceivables = filteredReceivables.filter((r) => selectedIds.has(r.id));
  const totalAmount = selectedReceivables.reduce(
    (sum, r) => sum + (paymentAmounts.get(r.id) || 0),
    0
  );

  // Prepare payment summary for confirmation dialog
  const paymentSummary = useMemo(() => {
    return selectedReceivables.map((receivable) => {
      const member = getMember(receivable.member_id);
      const paymentAmount = paymentAmounts.get(receivable.id) || 0;
      const newPaidAmount = Number(receivable.paid_amount) + paymentAmount;
      const newStatus = newPaidAmount >= Number(receivable.total_amount) ? "paid" : "partial";
      
      return {
        id: receivable.id,
        memberName: member?.full_name || "Unknown",
        beneficiaryId: member?.beneficiary_id || null,
        period: `${getMonthName(receivable.month)} ${receivable.year}`,
        totalAmount: Number(receivable.total_amount),
        paidAmount: Number(receivable.paid_amount),
        paymentAmount,
        newStatus,
      };
    });
  }, [selectedReceivables, paymentAmounts, members]);

  const handleShowConfirmation = () => {
    if (selectedIds.size === 0) {
      toast.error("Please select at least one receivable");
      return;
    }

    const invalidPayments = selectedReceivables.filter(
      (r) => !paymentAmounts.get(r.id) || paymentAmounts.get(r.id)! <= 0
    );
    if (invalidPayments.length > 0) {
      toast.error("All selected receivables must have a payment amount greater than 0");
      return;
    }

    setShowConfirmDialog(true);
  };

  const handleBulkPayment = async () => {
    setShowConfirmDialog(false);
    setLoading(true);

    try {
      const { data: user } = await supabase.auth.getUser();

      for (const receivable of selectedReceivables) {
        const paymentAmount = paymentAmounts.get(receivable.id) || 0;
        const newPaidAmount = Number(receivable.paid_amount) + paymentAmount;
        const newStatus = newPaidAmount >= Number(receivable.total_amount) ? "paid" : "partial";

        const { error: updateError } = await supabase
          .from("share_receivables")
          .update({
            paid_amount: newPaidAmount,
            status: newStatus,
            payment_date: newStatus === "paid" ? paymentDate.toISOString() : receivable.payment_date,
          })
          .eq("id", receivable.id);

        if (updateError) throw updateError;

        const member = getMember(receivable.member_id);
        await createJournalEntry({
          memberId: receivable.member_id,
          memberName: member?.full_name || "Unknown",
          amount: paymentAmount,
          paymentDate,
          year: receivable.year,
          month: receivable.month,
          userId: user.user?.id,
        });
      }

      toast.success(`${selectedIds.size} payments recorded successfully (à§³${totalAmount.toLocaleString()})`);
      
      // Invalidate queries and navigate back
      queryClient.invalidateQueries({ queryKey: ["share-receivables"] });
      queryClient.invalidateQueries({ queryKey: ["unpaid-share-receivables"] });
      router.push("/share-management");
    } catch (error: any) {
      console.error("Error recording bulk payments:", error);
      toast.error(error.message || "Failed to record payments");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/share-management")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold text-foreground">Bulk Share Payment</h2>
            <p className="text-muted-foreground mt-1">
              Record payments for multiple members at once. Partial payments are supported.
            </p>
          </div>
        </div>

        {/* Payment Date & Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Payment Date</p>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[240px] justify-start text-left font-normal",
                        !paymentDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {paymentDate ? format(paymentDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={paymentDate}
                      onSelect={(date) => date && setPaymentDate(date)}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Year" />
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

                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Month" />
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

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAll}>
                  Deselect All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Previous Month Unlock (Admin Only) */}
        {isAdmin && previousMonthCount > 0 && (
          <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {previousMonthUnlocked ? (
                    <Unlock className="h-5 w-5 text-amber-600" />
                  ) : (
                    <Lock className="h-5 w-5 text-amber-600" />
                  )}
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-200">
                      Previous Month Payments
                    </p>
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      {previousMonthCount} receivable(s) from previous months are {previousMonthUnlocked ? "visible" : "hidden"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="unlock-previous" className="text-sm text-amber-700 dark:text-amber-300">
                    {previousMonthUnlocked ? "Unlocked" : "Locked"}
                  </Label>
                  <Switch
                    id="unlock-previous"
                    checked={previousMonthUnlocked}
                    onCheckedChange={setPreviousMonthUnlocked}
                  />
                </div>
              </div>
              {previousMonthUnlocked && (
                <p className="mt-3 text-xs text-amber-600 dark:text-amber-400 border-t border-amber-200 dark:border-amber-800 pt-3">
                  âš ï¸ Admin approval granted. You can now record payments for previous months. 
                  This action will be logged for audit purposes.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Receivables Table */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Receivables</CardTitle>
            <CardDescription>
              {filteredReceivables.length} unpaid/partial receivables found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : filteredReceivables.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p className="text-lg font-medium">All caught up!</p>
                <p>No pending share receivables found.</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Select</TableHead>
                      <TableHead>Member</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Shares</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                      <TableHead className="w-[180px]">Payment Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReceivables.map((receivable) => {
                      const member = getMember(receivable.member_id);
                      const remaining = getRemainingAmount(receivable);
                      const isSelected = selectedIds.has(receivable.id);
                      const currentAmount = paymentAmounts.get(receivable.id) || 0;

                      return (
                        <TableRow 
                          key={receivable.id}
                          className={cn(isSelected && "bg-primary/5")}
                        >
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelection(receivable.id, receivable)}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{member?.full_name || "Unknown"}</p>
                              <p className="text-sm text-muted-foreground">
                                {member?.beneficiary_id || "-"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {getMonthName(receivable.month)} {receivable.year}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{receivable.share_quantity}</TableCell>
                          <TableCell className="text-right">
                            à§³{Number(receivable.total_amount).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-green-600">
                            à§³{Number(receivable.paid_amount).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-medium text-orange-600">
                            à§³{remaining.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {isSelected ? (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">à§³</span>
                                <Input
                                  type="number"
                                  value={currentAmount}
                                  onChange={(e) => updatePaymentAmount(receivable.id, parseFloat(e.target.value) || 0, remaining)}
                                  min={0}
                                  max={remaining}
                                  className="h-8 w-24"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setFullPayment(receivable.id, remaining)}
                                  className="text-xs h-8 px-2"
                                >
                                  Full
                                </Button>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">â€”</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary & Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex gap-8">
                <div>
                  <p className="text-sm text-muted-foreground">Selected Receivables</p>
                  <p className="text-2xl font-bold">{selectedIds.size}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Payment Amount</p>
                  <p className="text-2xl font-bold text-primary">à§³{totalAmount.toLocaleString()}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => router.push("/share-management")}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleShowConfirmation}
                  disabled={loading || selectedIds.size === 0}
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Record {selectedIds.size} Payments
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <BulkPaymentConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        onConfirm={handleBulkPayment}
        paymentDate={paymentDate}
        payments={paymentSummary}
        totalPaymentAmount={totalAmount}
        loading={loading}
      />
    </DashboardLayout>
  );
}

// Helper function to create journal entry for share payment
async function createJournalEntry({
  memberId,
  memberName,
  amount,
  paymentDate,
  year,
  month,
  userId,
}: {
  memberId: string;
  memberName: string;
  amount: number;
  paymentDate: Date;
  year: number;
  month: number;
  userId?: string;
}) {
  try {
    const { data: entryNumber } = await supabase.rpc("generate_entry_number");
    const monthName = format(new Date(year, month - 1, 1), "MMMM yyyy");

    const { data: cashAccount } = await supabase
      .from("accounts")
      .select("id")
      .eq("code", "1211")
      .maybeSingle();

    const { data: shareCapitalAccount } = await supabase
      .from("accounts")
      .select("id")
      .eq("code", "1222")
      .maybeSingle();

    if (!cashAccount || !shareCapitalAccount) {
      console.error("Required accounts not found for journal entry");
      return;
    }

    const { data: entry, error: entryError } = await supabase
      .from("journal_entries")
      .insert({
        entry_number: entryNumber,
        entry_date: format(paymentDate, "yyyy-MM-dd"),
        description: `Share payment received from ${memberName} for ${monthName}`,
        member_id: memberId,
        total_debit: amount,
        total_credit: amount,
        created_by: userId,
        status: "posted",
        posted_at: new Date().toISOString(),
        posted_by: userId,
      })
      .select()
      .single();

    if (entryError) throw entryError;

    const lines = [
      {
        journal_entry_id: entry.id,
        account_id: cashAccount.id,
        description: `Share payment from ${memberName}`,
        debit: amount,
        credit: 0,
        member_id: memberId,
      },
      {
        journal_entry_id: entry.id,
        account_id: shareCapitalAccount.id,
        description: `Share receivable cleared for ${memberName}`,
        debit: 0,
        credit: amount,
        member_id: memberId,
      },
    ];

    const { error: linesError } = await supabase
      .from("journal_entry_lines")
      .insert(lines);

    if (linesError) throw linesError;
  } catch (error) {
    console.error("Error creating journal entry:", error);
  }
}

