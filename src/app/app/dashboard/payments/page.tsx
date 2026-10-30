"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, CheckCircle2, CreditCard, Loader, Ticket, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetCurrentUserQuery } from "@/store/slices/authSlice/api.auth";
import {
    calculateFinancialSummary,
    getInstallmentStatus,
    INSTALLMENT_WARNING_DAYS,
    mapInstallmentToRecord,
    type FinePolicy,
    type InstallmentRecord,
} from "./installment-logic";
import {
    useCreateAamarPayPaymentMutation,
    useGetGatewayTransactionsQuery,
    useGetInstallmentsQuery,
} from "@/store/slices/paymentSlice/api.slice";
import { getCurrentDhakaDate, monthArray } from "@/lib/date/dhaka";
import { AdvanceInstallmentsCard } from "./advance-installments-card";
import { DueInstallmentsCard } from "./due-installments-card";
import { InstallmentHistoryCard } from "./installment-history-card";
import { useGetSettingsQuery } from "@/store/slices/settingSlice/api.setting";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/mongodb/client";

type FilterStatus = "ALL" | "PAID" | "DUE" | "OVERDUE" | "UPCOMING";

export default function PaymentsPage() {
    const { day, month, year } = getCurrentDhakaDate();
    const { data: settings, isLoading: settingLoading } = useGetSettingsQuery();
    const { data: currentUserData, isLoading: userLoading } = useGetCurrentUserQuery();
    const memberId = currentUserData?.data?._id;

    const {
        data: installmentData,
        isLoading: installmentsLoading,
        isError: installmentsError,
        error: installmentsErrorData,
        refetch: refetchInstallments,
    } = useGetInstallmentsQuery({ member: String(memberId) }, { skip: !memberId });

    let isPaid = installmentData?.data.find(item => item.month == month && item.year == year)

    const { data: gatewayTransactionData } = useGetGatewayTransactionsQuery(
        { member: String(memberId) },
        { skip: !memberId },
    );

    const [createPayment, { data: paymentData, isLoading: isPayingThisMonth }] = useCreateAamarPayPaymentMutation();

    useEffect(() => {
        if (paymentData?.paymentUrl) {
            window.location.replace(paymentData.paymentUrl);
        }
    }, [paymentData]);

    const [filter, setFilter] = useState<FilterStatus>("ALL");
    const [activeFineRule, setActiveFineRule] = useState<Record<string, unknown> | null>(null);

    useEffect(() => {
        if (!memberId) return;
        let cancelled = false;
        (async () => {
            try {
                const { data } = await supabase.from("fine_rules").select("*").order("created_at", { ascending: false });
                if (cancelled) return;
                const active = (data ?? []).find((rule: Record<string, unknown>) => rule?.is_active);
                setActiveFineRule(active ?? null);
            } catch {
                if (!cancelled) setActiveFineRule(null);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [memberId]);

    const currentDate = useMemo(() => new Date(), []);
    const member = currentUserData?.data;

    const defaultDueDay = settings?.data?.default_due_day ?? 10;
    const currencySymbol = settings?.data?.currency_symbol ?? "৳";
    const currency = (amount: number) => `${currencySymbol}${Number(amount ?? 0).toLocaleString()}`;

    const records: InstallmentRecord[] = useMemo(
        () => (installmentData?.data ?? []).map((doc) => mapInstallmentToRecord(doc, defaultDueDay)),
        [installmentData, defaultDueDay],
    );

    const finePolicy: FinePolicy = useMemo(() => {
        if (activeFineRule) {
            return {
                enabled: true,
                fineType: activeFineRule.fine_type as "fixed" | "percentage",
                fineValue: Number(activeFineRule.fine_value ?? 100),
                gracePeriodDays: Number(activeFineRule.grace_period_days ?? 5),
                isCumulative: Boolean(activeFineRule.is_cumulative),
                cumulativeFrequency: (activeFineRule.cumulative_frequency as "daily" | "weekly" | "monthly") ?? "monthly",
                maxFineAmount:
                    activeFineRule.max_fine_amount === null || activeFineRule.max_fine_amount === undefined
                        ? null
                        : Number(activeFineRule.max_fine_amount),
            };
        }
        return {
            enabled: settings?.data?.fine_enabled ?? true,
            fineType: "fixed",
            fineValue: settings?.data?.amount ?? 100,
            gracePeriodDays: 5,
            isCumulative: true,
            cumulativeFrequency: "monthly",
            maxFineAmount: null,
        };
    }, [activeFineRule, settings]);

    const summary = useMemo(() => calculateFinancialSummary(records, currentDate, finePolicy), [records, currentDate, finePolicy]);

    const totalAmountPaid = useMemo(
        () => records.filter((r) => r.status === "PAID").reduce((t, r) => t + r.amount, 0),
        [records],
    );
    const totalDueAmount = useMemo(
        () => records.filter((r) => r.status !== "PAID").reduce((t, r) => t + r.amount, 0) + summary.totalFineAmount,
        [records, summary.totalFineAmount],
    );

    const nextInstallment = records.find((installment) => installment.status !== "PAID") ?? records[0];
    const nextInstallmentStatus = nextInstallment ? getInstallmentStatus(nextInstallment, currentDate) : "PAID";
    const nextDueDays = nextInstallment ? Math.ceil((new Date(nextInstallment.dueDate).getTime() - currentDate.getTime()) / 86400000) : 0;

    const handlePayThisMonth = () => {
        if (!memberId) return;
        const currentInstallment = (installmentData?.data ?? []).find(
            (inst) => Number(inst.month) === month && Number(inst.year) === year,
        );
        const amount = currentInstallment
            ? Number(currentInstallment.amount ?? 0)
            : Number(settings?.data?.default_contribution_amount ?? settings?.data?.share_value ?? 0);
        if (!amount) return;
        createPayment({
            amount,
            description: "Current month installment",
            name: member?.full_name || "Member",
            status: "regular",
            installments: [{ month, year, day }],
        });
    };

    if (userLoading || settingLoading) return <Skeleton />;

    if (!memberId) {
        return (
            <div className="mx-auto max-w-6xl space-y-6 py-4">
                <Card>
                    <CardContent className="py-8 text-center text-sm text-muted-foreground">
                        Sign in to view your payment dashboard.
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (installmentsLoading) return <Skeleton />;

    if (installmentsError) {
        return (
            <div className="mx-auto max-w-6xl space-y-6 py-4">
                <Card>
                    <CardContent className="space-y-4 py-8 text-center">
                        <p className="text-sm text-red-600">
                            {"message" in (installmentsErrorData ?? {})
                                ? String((installmentsErrorData as { message?: string }).message)
                                : "Failed to load installments."}
                        </p>
                        <Button variant="outline" onClick={() => refetchInstallments()}>
                            Retry
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-6xl space-y-6 py-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Member payment dashboard</p>
                    <h1 className="mt-1 text-3xl font-bold">{member?.full_name || "Member"} installment overview</h1>
                </div>
                {!isPaid && settings?.data?.default_due_day < day && (
                    <div className="w-fit flex items-center justify-center text-red-400">
                        <TriangleAlert className="mr-2 h-4 w-4" />
                        Current month installment is due
                    </div>
                )}
                {!isPaid && settings?.data?.default_due_day >= day && (
                    <Button className="w-fit" onClick={handlePayThisMonth} disabled={isPayingThisMonth}>
                        <CreditCard className="mr-2 h-4 w-4" />
                        {isPayingThisMonth ? "Processing..." : "Pay Installment of this month"}
                    </Button>
                )}
                {isPaid && <div className="w-fit flex items-center justify-center text-green-400">
                    <Check size={30} className="mr-2 h-4 w-4" />
                    Current month installment is Paid
                </div>}
            </div>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total amount paid</CardDescription>
                        <CardTitle className="text-3xl font-semibold">{currency(totalAmountPaid)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">Paid installments: {summary.paidInstallments}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total due</CardDescription>
                        <CardTitle className="text-3xl font-semibold">{currency(totalDueAmount)}</CardTitle>
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
            <DueInstallmentsCard
                currency={currency}
                defaultDueDay={defaultDueDay}
                finePolicy={finePolicy}
                currentDate={currentDate}
            />

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

            <AdvanceInstallmentsCard
                currency={currency}
            />

            <InstallmentHistoryCard
                filter={filter}
                onFilterChange={setFilter}
                records={records}
                currency={currency}
                monthArray={monthArray}
                getStatusBadgeVariant={getStatusBadgeVariant}
                currentDate={currentDate}
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

function getStatusBadgeVariant(status: string) {
    status = status.toUpperCase();
    switch (status) {
        case "PAID":
            return "default";
        case "OVERDUE":
            return "destructive";
        case "DUE":
            return "secondary";
        case "DUE_SOON":
            return "secondary";
        case "ADVANCE":
            return "outline";
        default:
            return "outline";
    }
}
