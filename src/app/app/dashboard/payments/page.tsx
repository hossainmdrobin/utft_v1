"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, CreditCard, Landmark } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetCurrentUserQuery } from "@/store/slices/authSlice/api.auth";
import {
    calculateFinancialSummary,
    calculatePerInstallmentFine,
    getInstallmentStatus,
    INSTALLMENT_WARNING_DAYS,
    type InstallmentRecord,
} from "./installment-logic";
import { memberInstallments } from "./installment-data";
import {
    useGetGatewayTransactionsQuery,
    useGetInstallmentsQuery,
} from "@/store/slices/paymentSlice/api.slice";
import { getCurrentDhakaDate, monthArray } from "@/lib/date/dhaka";
import { AdvanceInstallmentsCard } from "./advance-installments-card";
import { InstallmentHistoryCard } from "./installment-history-card";

type FilterStatus = "ALL" | "PAID" | "DUE" | "OVERDUE" | "UPCOMING";

const currency = (amount: number) => `৳${amount.toLocaleString()}`;

function formatMonthLabel(period: string) {
    const [year, month] = period.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    return new Intl.DateTimeFormat("en-BD", { month: "long", year: "numeric" }).format(date);
}


function getStatusBadgeVariant(status: string) {
    status = status.toUpperCase();
    switch (status) {
        case "PAID":
            return "default";
        case "OVERDUE":
            return "destructive";
        case "DUE":
            return "secondary";
        case "ADVANCE":
            return "outline";
        default:
            return "outline";
    }
}

export default function PaymentsPage() {
    // CUSTOM HOOKS
    const { month, year } = getCurrentDhakaDate()
    //RTK QUERY
    const { data: currentUserData } = useGetCurrentUserQuery();
    const memberId = currentUserData?.data?._id;
    const { data: installmentData } = useGetInstallmentsQuery({ member: String(memberId) }, { skip: !memberId });
    const { data: gatewayTransactionData } = useGetGatewayTransactionsQuery(
        { member: String(memberId) },
        { skip: !memberId },
    );
    const [filter, setFilter] = useState<FilterStatus>("ALL");
    const [installments, setInstallments] = useState<InstallmentRecord[]>(memberInstallments);

    const currentDate = useMemo(() => new Date("2026-08-21T12:00:00.000Z"), []);
    const member = currentUserData?.data;

    const summary = useMemo(() => calculateFinancialSummary(installments, currentDate), [installments, currentDate]);

    const dueInstallments = useMemo(
        () => installments.filter((installment) => installment.status !== "PAID" && ["DUE", "OVERDUE"].includes(getInstallmentStatus(installment, currentDate))),
        [installments, currentDate],
    );

    const warningItems = useMemo(
        () => installments.filter((installment) => installment.status !== "PAID" && ["DUE_SOON", "DUE", "OVERDUE"].includes(getInstallmentStatus(installment, currentDate))),
        [installments, currentDate],
    );

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
                        {/* <p className="text-sm text-muted-foreground">Due: {nextInstallment ? formatDueDate(nextInstallment.dueDate) : "N/A"}</p> */}
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

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between gap-2">
                            <CardTitle>Recent transactions</CardTitle>
                            <Button variant="outline" size="sm">View all transactions</Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {gatewayTransactionData?.data?.length ? gatewayTransactionData.data.map((transaction) => (
                            <div key={transaction._id} className="rounded-lg border p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="font-semibold">{transaction.transaction_id}</p>
                                        <p className="text-sm text-muted-foreground">{transaction.created_at ? new Intl.DateTimeFormat("en-BD", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(transaction.created_at)) : "Date unavailable"}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold">{currency(transaction.amount)}</p>
                                        <p className="text-sm text-muted-foreground">{transaction.description || "Gateway payment"}</p>
                                    </div>
                                </div>
                                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                    <span>{transaction.method}</span>
                                    <span>•</span>
                                    <span>{transaction.status}</span>
                                    <span>•</span>
                                    <span>{transaction.currency}</span>
                                </div>
                            </div>
                        )) : (
                            <p className="text-sm text-muted-foreground">No gateway transactions found.</p>
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
                                {/* <p className="mt-1 text-sm text-muted-foreground">Due: {formatDueDate(installment.dueDate)}</p> */}
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

            <AdvanceInstallmentsCard
                currency={currency}
            />

            <InstallmentHistoryCard
                filter={filter}
                onFilterChange={setFilter}
                installmentData={installmentData}
                currency={currency}
                monthArray={monthArray}
                getStatusBadgeVariant={getStatusBadgeVariant}
            />

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
