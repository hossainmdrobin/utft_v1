"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  CircleDollarSign,
  Clock,
  AlertTriangle,
  Check,
  CheckCircle2,
  Receipt,
  Minus,
  Plus,
  ShieldCheck,
  RotateCcw,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { getCurrentDhakaDate, monthArray } from "@/lib/date/dhaka";
import { useGetSettingsQuery } from "@/store/slices/settingSlice/api.setting";
import {
  Installment,
  useActionOnInstallmentMutation,
  useCreateManualInstallmentMutation,
  useGetInstallmentsByMemberIdQuery,
} from "@/store/slices/installmentSlice/api.installment";

interface MemberInstallmentsSectionProps {
  memberId: string;
  member?: any;
}

function formatPeriod(year: number, month: number): string {
  if (!year || !month) return "N/A";
  const monthName = monthArray[month - 1] || `Month ${month}`;
  return `${monthName} ${year}`;
}

function formatDueDate(year: number, month: number, day: number): string {
  if (!year || !month) return "N/A";
  const monthName = monthArray[month - 1] || `Month ${month}`;
  return `${day} ${monthName} ${year}`;
}

function formatPaidDate(paidAt?: string, updatedAt?: string, dateStr?: string): string {
  const target = paidAt || updatedAt || dateStr;
  if (!target) return "N/A";
  try {
    const d = new Date(target);
    if (isNaN(d.getTime())) return target;
    return format(d, "dd MMM yyyy");
  } catch {
    return target;
  }
}

function isInstallmentPaid(item: Installment): boolean {
  return (
    item.payment_status === "paid" ||
    String(item.status || "").toLowerCase() === "paid" ||
    Boolean(item.transaction_id)
  );
}

export function MemberInstallmentsSection({ memberId, member }: MemberInstallmentsSectionProps) {
  const { toast } = useToast();
  const { data: settings } = useGetSettingsQuery();
  const {
    data: installmentsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetInstallmentsByMemberIdQuery({ id: memberId }, { skip: !memberId });

  const [actionOnInstallment] = useActionOnInstallmentMutation();
  const [createManualInstallment, { isLoading: isCreatingAdvance }] = useCreateManualInstallmentMutation();

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [advanceCount, setAdvanceCount] = useState<number>(1);

  const currencySymbol = settings?.data?.currency_symbol || "৳";
  const defaultDueDay = Number(settings?.data?.default_due_day) || 10;
  const shareQuantity = Number(member?.share_quantity) > 0 ? Number(member.share_quantity) : 1;
  const shareValue = Number(settings?.data?.share_value) || 0;
  const monthlyAmount =
    shareValue > 0
      ? shareQuantity * shareValue
      : Number(settings?.data?.default_contribution_amount) || 0;

  const formatCurrency = (amount: number) => `${currencySymbol}${Number(amount || 0).toFixed(2)}`;

  const currentDhaka = getCurrentDhakaDate();

  const dueInstallments = useMemo(() => {
    if (!installmentsData) return [];
    return installmentsData
      .filter((item) => !isInstallmentPaid(item))
      .sort((a, b) => {
        const yearDiff = (a.year || 0) - (b.year || 0);
        if (yearDiff !== 0) return yearDiff;
        return (a.month || 0) - (b.month || 0);
      });
  }, [installmentsData]);

  const paidInstallments = useMemo(() => {
    if (!installmentsData) return [];
    return installmentsData
      .filter((item) => isInstallmentPaid(item))
      .sort((a, b) => {
        const yearDiff = (b.year || 0) - (a.year || 0);
        if (yearDiff !== 0) return yearDiff;
        return (b.month || 0) - (a.month || 0);
      });
  }, [installmentsData]);

  const isOverdue = (item: Installment) => {
    const dueDay = item.day || defaultDueDay;
    if ((item.year || 0) < currentDhaka.year) return true;
    if ((item.year || 0) === currentDhaka.year && (item.month || 0) < currentDhaka.month) return true;
    if (
      (item.year || 0) === currentDhaka.year &&
      (item.month || 0) === currentDhaka.month &&
      currentDhaka.day > dueDay
    ) {
      return true;
    }
    return false;
  };

  const getStartingPeriod = () => {
    const currentPeriod = currentDhaka.year * 12 + currentDhaka.month;
    const existingPeriods = new Set<number>(
      (installmentsData || [])
        .filter((i) => i.year && i.month)
        .map((i) => (i.year || 0) * 12 + (i.month || 0))
    );

    if (!existingPeriods.has(currentPeriod)) {
      let maxFuturePeriod = currentPeriod - 1;
      for (const p of existingPeriods) {
        if (p > maxFuturePeriod) maxFuturePeriod = p;
      }
      return maxFuturePeriod < currentPeriod ? currentPeriod : maxFuturePeriod + 1;
    } else {
      let maxPeriod = currentPeriod;
      for (const p of existingPeriods) {
        if (p > maxPeriod) maxPeriod = p;
      }
      return maxPeriod + 1;
    }
  };

  const startPeriod = getStartingPeriod();
  const futureInstallments = useMemo(() => {
    return Array.from({ length: advanceCount }, (_, index) => {
      const period = startPeriod + index;
      const tempMonth = ((period - 1) % 12) + 1;
      const tempYear = Math.floor((period - 1) / 12);
      const isCurrentMonth = tempYear === currentDhaka.year && tempMonth === currentDhaka.month;
      return {
        month: tempMonth,
        year: tempYear,
        day: defaultDueDay,
        status: isCurrentMonth ? "regular" : "advance",
        payment_status: "paid",
        amount: monthlyAmount,
        paid_at: new Date().toISOString(),
        method: "manual",
      };
    });
  }, [advanceCount, startPeriod, defaultDueDay, monthlyAmount, currentDhaka]);

  const handleMarkAsPaid = async (item: Installment) => {
    if (!item._id) return;
    try {
      setActionLoadingId(item._id);
      await actionOnInstallment({
        id: item._id,
        memberId,
        status: "paid",
        payment_status: "paid",
        paid_at: new Date().toISOString(),
        method: "manual",
      }).unwrap();
      toast({
        title: "Installment Updated",
        description: `Installment for ${formatPeriod(item.year, item.month)} marked as paid.`,
      });
    } catch (err: any) {
      toast({
        title: "Update Failed",
        description: err?.data?.message || err?.message || "Failed to mark installment as paid.",
        variant: "destructive",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAdvancePayment = async () => {
    if (futureInstallments.length === 0 || !memberId) return;
    try {
      await createManualInstallment({
        member: memberId,
        data: futureInstallments,
      }).unwrap();
      toast({
        title: "Advance Recorded",
        description: `Successfully recorded ${advanceCount} advance installment(s).`,
      });
      setAdvanceCount(1);
    } catch (err: any) {
      toast({
        title: "Failed to Record Advance",
        description: err?.data?.message || err?.message || "Could not create advance installments.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-xl flex items-center gap-2">
            <CircleDollarSign className="h-5 w-5 text-primary" />
            Member Installments
          </CardTitle>
          <CardDescription>
            Manage and track monthly installment dues, payment records, and advance contributions.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
          aria-label="Refresh installments"
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : isError ? (
          <Alert variant="destructive" className="my-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error Loading Installments</AlertTitle>
            <AlertDescription className="flex items-center justify-between mt-2">
              <span>{(error as any)?.data?.message || "Failed to load installment history for this member."}</span>
              <Button size="sm" variant="outline" onClick={() => refetch()}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <Tabs defaultValue="due" className="space-y-4">
            <TabsList className="flex-wrap">
              <TabsTrigger value="due" className="flex items-center gap-2">
                Due Installments
                {dueInstallments.length > 0 && (
                  <Badge variant="destructive" className="px-1.5 py-0 text-xs">
                    {dueInstallments.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="paid" className="flex items-center gap-2">
                Paid Installments
                <Badge variant="secondary" className="px-1.5 py-0 text-xs">
                  {paidInstallments.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="advance" className="flex items-center gap-2">
                Record Advance
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Due Installments */}
            <TabsContent value="due">
              {dueInstallments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center border rounded-lg bg-muted/10">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2" />
                  <p className="text-base font-medium text-foreground">No Due Installments</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    All installments for this member are up to date.
                  </p>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dueInstallments.map((item) => {
                        const overdue = isOverdue(item);
                        const isActionLoading = actionLoadingId === item._id;
                        return (
                          <TableRow key={item._id || `${item.year}-${item.month}`}>
                            <TableCell className="font-medium">
                              {formatPeriod(item.year, item.month)}
                            </TableCell>
                            <TableCell>{formatCurrency(item.amount)}</TableCell>
                            <TableCell>
                              {formatDueDate(item.year, item.month, item.day || defaultDueDay)}
                            </TableCell>
                            <TableCell>
                              {overdue ? (
                                <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                                  <AlertTriangle className="h-3 w-3" /> Overdue
                                </Badge>
                              ) : (
                                <Badge
                                  variant="secondary"
                                  className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20 flex items-center gap-1 w-fit"
                                >
                                  <Clock className="h-3 w-3" /> Due
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8"
                                disabled={isActionLoading}
                                onClick={() => handleMarkAsPaid(item)}
                              >
                                {isActionLoading ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                                ) : (
                                  <Check className="h-3.5 w-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
                                )}
                                Mark as Paid
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Tab 2: Paid Installments */}
            <TabsContent value="paid">
              {paidInstallments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center border rounded-lg bg-muted/10">
                  <Receipt className="h-10 w-10 text-muted-foreground/60 mb-2" />
                  <p className="text-base font-medium text-foreground">No Paid Installments</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    No payment records found for this member yet.
                  </p>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Paid Date</TableHead>
                        <TableHead>Method / Transaction</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paidInstallments.map((item) => {
                        const methodDisplay = item.method
                          ? item.method.charAt(0).toUpperCase() + item.method.slice(1)
                          : item.transaction_id
                          ? "Online"
                          : "Manual";
                        return (
                          <TableRow key={item._id || `${item.year}-${item.month}`}>
                            <TableCell className="font-medium">
                              {formatPeriod(item.year, item.month)}
                            </TableCell>
                            <TableCell>{formatCurrency(item.amount)}</TableCell>
                            <TableCell>
                              {formatPaidDate(item.paid_at, item.updated_at, item.date)}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">{methodDisplay}</span>
                                {item.transaction_id && (
                                  <span className="font-mono text-xs text-muted-foreground truncate max-w-[200px]">
                                    {item.transaction_id}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge
                                  variant="default"
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 w-fit"
                                >
                                  <Check className="h-3 w-3" /> Paid
                                </Badge>
                                {item.status === "advance" && (
                                  <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                                    Advance
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Tab 3: Record Advance */}
            <TabsContent value="advance" className="space-y-4">
              <div className="rounded-lg border p-4 bg-muted/10 space-y-4">
                <div>
                  <h4 className="text-sm font-medium">Record Advance Monthly Installments</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Generate and mark future monthly installments as paid for this member.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-3 rounded-lg border bg-background p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium">Number of months</span>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setAdvanceCount((prev) => Math.max(1, prev - 1))}
                          disabled={advanceCount <= 1 || isCreatingAdvance}
                          aria-label="Decrease months"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="min-w-8 text-center text-lg font-semibold">
                          {advanceCount}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setAdvanceCount((prev) => prev + 1)}
                          disabled={isCreatingAdvance}
                          aria-label="Increase months"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      {[2, 3, 6].map((count) => (
                        <Button
                          key={count}
                          type="button"
                          size="sm"
                          variant={advanceCount === count ? "default" : "outline"}
                          onClick={() => setAdvanceCount(count)}
                          disabled={isCreatingAdvance}
                          className="flex-1"
                        >
                          {count} months
                        </Button>
                      ))}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setAdvanceCount(1)}
                        disabled={advanceCount === 1 || isCreatingAdvance}
                        title="Reset to 1 month"
                        aria-label="Reset to 1 month"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between gap-3 rounded-lg border bg-muted/20 p-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-medium">
                        Months Covered ({futureInstallments.length})
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2 max-h-24 overflow-y-auto">
                        {futureInstallments.map((fi) => (
                          <Badge key={`${fi.year}-${fi.month}`} variant="secondary" className="text-xs">
                            {formatPeriod(fi.year, fi.month)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="pt-2 border-t flex items-baseline justify-between">
                      <span className="text-xs text-muted-foreground">
                        Rate: {formatCurrency(monthlyAmount)}/mo ({shareQuantity} share{shareQuantity > 1 ? "s" : ""})
                      </span>
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground block">Total Amount</span>
                        <span className="text-xl font-bold text-foreground">
                          {formatCurrency(monthlyAmount * advanceCount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleAdvancePayment}
                    disabled={isCreatingAdvance || futureInstallments.length === 0 || monthlyAmount <= 0}
                    className="w-full sm:w-auto"
                  >
                    {isCreatingAdvance ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="mr-2 h-4 w-4" />
                    )}
                    Record Advance Payment ({formatCurrency(monthlyAmount * advanceCount)})
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
