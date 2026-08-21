"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, CircleDollarSign, CreditCard, Landmark, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetCurrentUserQuery } from "@/store/slices/authSlice/api.auth";
import {
  applyInstallmentPayment,
  calculateFinancialSummary,
  calculatePerInstallmentFine,
  getInstallmentStatus,
  INSTALLMENT_WARNING_DAYS,
  type InstallmentRecord,
} from "./installment-logic";
import { memberInstallments, paymentTransactions } from "./installment-data";
import { useCreateAamarPayPaymentMutation } from "@/store/slices/paymentSlice/api.slice";
import { useGetSettingsQuery } from "@/store/slices/settingSlice/api.setting";

type FilterStatus = "ALL" | "PAID" | "DUE" | "OVERDUE" | "UPCOMING";

const currency = (amount: number) => `৳${amount.toLocaleString()}`;

function formatMonthLabel(period: string) {
  const [year, month] = period.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return new Intl.DateTimeFormat("en-BD", { month: "long", year: "numeric" }).format(date);
}

function formatDueDate(date: string) {
  return new Intl.DateTimeFormat("en-BD", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date));
}

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case "PAID":
      return "default";
    case "OVERDUE":
      return "destructive";
    case "DUE":
      return "secondary";
    case "DUE_SOON":
      return "outline";
    default:
      return "outline";
  }
}

export default function PaymentsPage() {
  //RTK QUERY
  const { data: currentUserData } = useGetCurrentUserQuery();
  const {data:setting} = useGetSettingsQuery();
  const [createPayment,{data:aamarpayPaymentData,}] = useCreateAamarPayPaymentMutation()

  const [selectedInstallmentIds, setSelectedInstallmentIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<FilterStatus>("ALL");
  const [installments, setInstallments] = useState<InstallmentRecord[]>(memberInstallments);

  const currentDate = useMemo(() => new Date("2026-08-21T12:00:00.000Z"), []);
  const member = currentUserData?.data;

  const summary = useMemo(() => calculateFinancialSummary(installments, currentDate), [installments, currentDate]);

  const dueInstallments = useMemo(
    () => installments.filter((installment) => installment.status !== "PAID" && ["DUE", "OVERDUE"].includes(getInstallmentStatus(installment, currentDate))),
    [installments, currentDate],
  );

  const fineInstallments = useMemo(
    () => installments.filter((installment) => installment.status !== "PAID" && calculatePerInstallmentFine(installment, currentDate) > 0),
    [installments, currentDate],
  );

  const upcomingInstallments = useMemo(
    () => installments.filter((installment) => installment.status !== "PAID" && getInstallmentStatus(installment, currentDate) === "UPCOMING"),
    [installments, currentDate],
  );

  const warningItems = useMemo(
    () => installments.filter((installment) => installment.status !== "PAID" && ["DUE_SOON", "DUE", "OVERDUE"].includes(getInstallmentStatus(installment, currentDate))),
    [installments, currentDate],
  );

  const filteredHistory = useMemo(() => {
    if (filter === "ALL") return installments;
    return installments.filter((installment) => getInstallmentStatus(installment, currentDate) === filter || (installment.status === "PAID" && filter === "PAID"));
  }, [filter, installments, currentDate]);

  const advanceOptions = useMemo(
    () => upcomingInstallments.filter((installment) => !selectedInstallmentIds.includes(installment.id) || selectedInstallmentIds.includes(installment.id)),
    [selectedInstallmentIds, upcomingInstallments],
  );

  const advanceTotal = useMemo(
    () => installments.filter((installment) => selectedInstallmentIds.includes(installment.id)).reduce((total, installment) => total + installment.amount, 0),
    [installments, selectedInstallmentIds],
  );

  const toggleInstallmentSelection = (installmentId: string) => {
    setSelectedInstallmentIds((current) =>
      current.includes(installmentId) ? current.filter((id) => id !== installmentId) : [...current, installmentId],
    );
  };

  const handleAdvancePay = () => {
    if (selectedInstallmentIds.length === 0) return;
    const nextInstallments = applyInstallmentPayment(installments, selectedInstallmentIds, "TXN-ADVANCE-NEW", currentDate.toISOString());
    setInstallments(nextInstallments);
    setSelectedInstallmentIds([]);
  };

  const nextInstallment = installments.find((installment) => installment.status !== "PAID") ?? installments[0];
  const nextInstallmentStatus = nextInstallment ? getInstallmentStatus(nextInstallment, currentDate) : "PAID";
  const nextDueDays = nextInstallment ? Math.ceil((new Date(nextInstallment.dueDate).getTime() - currentDate.getTime()) / 86400000) : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Member payment dashboard</p>
          <h1 className="mt-1 text-3xl font-bold">{member?.full_name || "Member"} installment overview</h1>
        </div>
        <Button className="w-fit">
          <CreditCard className="mr-2 h-4 w-4" />
          Pay current due
        </Button>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total amount paid</CardDescription>
            <CardTitle className="text-3xl font-semibold">{currency(summary.totalPaidAmount)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Paid installments: {summary.paidInstallments}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total due</CardDescription>
            <CardTitle className="text-3xl font-semibold">{currency(summary.totalDueAmount)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Due installments: {summary.dueInstallments}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Next installment</CardDescription>
            <CardTitle className="text-3xl font-semibold">{currency(nextInstallment?.amount ?? 0)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-sm text-muted-foreground">Due: {nextInstallment ? formatDueDate(nextInstallment.dueDate) : "N/A"}</p>
            <p className="text-sm text-muted-foreground">{Math.abs(nextDueDays)} days remaining</p>
            <Badge variant={getStatusBadgeVariant(nextInstallmentStatus)}>{nextInstallmentStatus}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Upcoming amount</CardDescription>
            <CardTitle className="text-3xl font-semibold">{currency(summary.upcomingAmount)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Upcoming installments: {summary.upcomingInstallments}</p>
          </CardContent>
        </Card>
      </section>

      {warningItems.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              Installment reminders
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {warningItems.map((item) => {
              const status = getInstallmentStatus(item, currentDate);
              const daysRemaining = Math.ceil((new Date(item.dueDate).getTime() - currentDate.getTime()) / 86400000);
              const message = status === "OVERDUE"
                ? `Your installment of ${currency(item.amount)} is overdue by ${Math.abs(daysRemaining)} day(s).`
                : status === "DUE"
                  ? `Your installment of ${currency(item.amount)} is due today.`
                  : `Your installment of ${currency(item.amount)} is due in ${daysRemaining} day(s).`;

              return (
                <p key={item.id} className="text-sm text-amber-800 dark:text-amber-200">
                  {status === "OVERDUE" || status === "DUE" ? "🔴 " : "⚠️ "}
                  {message}
                </p>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Recent transactions</CardTitle>
              <Button variant="outline" size="sm">View all transactions</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {paymentTransactions.map((transaction) => (
              <div key={transaction.id} className="rounded-lg border p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold">{transaction.transactionId}</p>
                    <p className="text-sm text-muted-foreground">{new Intl.DateTimeFormat("en-BD", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(transaction.paidAt))}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{currency(transaction.amount)}</p>
                    <p className="text-sm text-muted-foreground">{transaction.installmentIds.length} installments</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>{transaction.paymentMethod}</span>
                  <span>•</span>
                  <span>{transaction.status}</span>
                  <span>•</span>
                  <span>{transaction.currency}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Landmark className="h-5 w-5 text-primary" /> Fine section</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {fineInstallments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No fine is currently due for unpaid installments.</p>
            ) : (
              fineInstallments.map((installment) => {
                const fineAmount = calculatePerInstallmentFine(installment, currentDate);
                return (
                  <div key={installment.id} className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/60 dark:bg-red-950/20">
                    <p className="font-medium">{formatMonthLabel(installment.period)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Due: {formatDueDate(installment.dueDate)}</p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-red-700 dark:text-red-300">Fine: {currency(fineAmount)}</p>
                        <p className="text-xs text-muted-foreground">{getInstallmentStatus(installment, currentDate)}</p>
                      </div>
                      <Button size="sm" variant="destructive">Pay fine</Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Landmark className="h-5 w-5 text-primary" /> Due installments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {dueInstallments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No installments are currently due.</p>
          ) : (
            dueInstallments.map((installment) => (
              <div key={installment.id} className="rounded-lg border p-3">
                <p className="font-medium">{formatMonthLabel(installment.period)}</p>
                <p className="mt-1 text-sm text-muted-foreground">Due: {formatDueDate(installment.dueDate)}</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{currency(installment.amount)}</p>
                    <p className="text-xs text-red-600">Fine: {currency(calculatePerInstallmentFine(installment, currentDate))}</p>
                  </div>
                  <Button size="sm">Pay</Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CircleDollarSign className="h-5 w-5 text-primary" /> Pay future installments in advance</CardTitle>
          <CardDescription>
            Select unpaid future installments and pay them together. Only unpaid future records are eligible.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            {advanceOptions.map((installment) => (
              <label key={installment.id} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={selectedInstallmentIds.includes(installment.id)} onChange={() => toggleInstallmentSelection(installment.id)} className="h-4 w-4 accent-primary" />
                  <div>
                    <p className="font-medium">{formatMonthLabel(installment.period)}</p>
                    <p className="text-sm text-muted-foreground">{formatDueDate(installment.dueDate)}</p>
                  </div>
                </div>
                <span className="font-medium">{currency(installment.amount)}</span>
              </label>
            ))}
          </div>

          <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Selected installments</p>
              <p className="text-xl font-semibold">{selectedInstallmentIds.length} items</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{currency(advanceTotal)}</p>
            </div>
            <Button onClick={handleAdvancePay} disabled={selectedInstallmentIds.length === 0}>
              <ShieldCheck className="mr-2 h-4 w-4" />
              Pay {currency(advanceTotal)}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Installment history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(["ALL", "PAID", "DUE", "OVERDUE", "UPCOMING"] as const).map((status) => (
              <Button
                key={status}
                variant={filter === status ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(status)}
              >
                {status}
              </Button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Month</th>
                  <th className="pb-3 pr-4 font-medium">Due date</th>
                  <th className="pb-3 pr-4 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((installment) => {
                  const status = getInstallmentStatus(installment, currentDate);
                  return (
                    <tr key={installment.id} className="border-b last:border-0">
                      <td className="py-3 pr-4">{formatMonthLabel(installment.period)}</td>
                      <td className="py-3 pr-4">{formatDueDate(installment.dueDate)}</td>
                      <td className="py-3 pr-4">{currency(installment.amount)}</td>
                      <td className="py-3">
                        <Badge variant={getStatusBadgeVariant(status)}>{status}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-primary" /> Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Monthly Installment: {currency(summary.monthlyInstallment)}</p>
            <p>Total Installments Generated: {summary.totalInstallmentsGenerated}</p>
            <p>Paid Installments: {summary.paidInstallments}</p>
            <p>Due Installments: {summary.dueInstallments}</p>
            <p>Fine Installments: {summary.fineInstallments}</p>
            <p>Upcoming Installments: {summary.upcomingInstallments}</p>
            <p>Total Amount Paid: {currency(summary.totalPaidAmount)}</p>
            <p>Total Amount Due: {currency(summary.totalDueAmount)}</p>
            <p>Fine Amount: {currency(summary.totalFineAmount)}</p>
            <p>Upcoming Amount: {currency(summary.upcomingAmount)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-primary" /> Config</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Warning window: {INSTALLMENT_WARNING_DAYS} days</p>
            <p>Due soon threshold: 1-5 days before due date</p>
            <p>Payment behavior: only successfully confirmed transactions mark installments as paid.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
