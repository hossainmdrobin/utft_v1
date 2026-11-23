"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetCurrentUserQuery } from "@/store/slices/authSlice/api.auth";
import { useGetSettingsQuery } from "@/store/slices/settingSlice/api.setting";
import { useGetInstallmentsQuery, type Installment } from "@/store/slices/paymentSlice/api.slice";
import { getCurrentDhakaDate, monthArray } from "@/lib/date/dhaka";
import { getInstallmentStatus, mapInstallmentToRecord, type InstallmentRecord } from "../payments/installment-logic";

type StatusFilter = "ALL" | "PAID" | "DUE" | "OVERDUE" | "UPCOMING";

function parseMonthKey(monthKey: string): { year: number; month: number } {
  const [yearStr, monthStr] = monthKey.split("-");
  return {
    year: Number(yearStr),
    month: Number(monthStr),
  };
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
    case "UPCOMING":
      return "secondary";
    default:
      return "outline";
  }
}

function formatPaidAt(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return new Intl.DateTimeFormat("en-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export default function InstallmentsPage() {
  const { data: currentUserData, isLoading: userLoading } = useGetCurrentUserQuery();
  const { data: settings, isLoading: settingsLoading } = useGetSettingsQuery();

  const currentUserRole = currentUserData?.data?.role;
  const isAdmin = ["admin", "president", "director", "accountant", "auditor"].includes(currentUserRole);

  const dhakaNow = getCurrentDhakaDate();
  const defaultMonthKey = useMemo(() => {
    const m = String(dhakaNow.month).padStart(2, "0");
    return `${dhakaNow.year}-${m}`;
  }, [dhakaNow.month, dhakaNow.year]);

  const [monthKey, setMonthKey] = useState(defaultMonthKey);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const { year: selectedYear, month: selectedMonth } = useMemo(() => parseMonthKey(monthKey), [monthKey]);
  const defaultDueDay = settings?.data?.default_due_day ?? 10;

  const currencySymbol = settings?.data?.currency_symbol ?? "৳";
  const currency = (amount: number) => `${currencySymbol}${Number(amount ?? 0).toLocaleString()}`;

  const monthOptions = useMemo(() => {
    // Build a range around the current month (Dhaka time): 12 months back + 6 months forward.
    const totalMonthsBack = 12;
    const totalMonthsForward = 6;
    const result: Array<{ key: string; label: string; year: number; month: number }> = [];

    const baseYear = dhakaNow.year;
    const baseMonth = dhakaNow.month; // 1..12

    const addMonths = (y: number, m: number, delta: number) => {
      // y*12 + (m-1) is a monotonic month index.
      const idx = y * 12 + (m - 1) + delta;
      const newY = Math.floor(idx / 12);
      const newM = (idx % 12) + 1;
      return { year: newY, month: newM };
    };

    for (let delta = -totalMonthsBack; delta <= totalMonthsForward; delta++) {
      const { year, month } = addMonths(baseYear, baseMonth, delta);
      const key = `${year}-${String(month).padStart(2, "0")}`;
      const label = `${monthArray[month - 1] ?? `Month ${month}`} ${year}`;
      result.push({ key, label, year, month });
    }

    return result;
  }, [dhakaNow.month, dhakaNow.year]);

  const { data: installmentData, isLoading: installmentsLoading } = useGetInstallmentsQuery(
    { month: selectedMonth, year: selectedYear },
    {
      skip: !isAdmin,
    },
  );

  const rows = useMemo(() => {
    const docs: Installment[] = installmentData?.data ?? [];

    return docs
      .map((doc) => {
        const record: InstallmentRecord = mapInstallmentToRecord(doc as unknown as Record<string, unknown>, defaultDueDay);

        const memberName = (() => {
          if (typeof doc.member !== "object" || doc.member === null) return undefined;
          if (!("full_name" in doc.member)) return undefined;
          const maybeMember = doc.member as { full_name?: unknown };
          return typeof maybeMember.full_name === "string" ? maybeMember.full_name : undefined;
        })();

        return { record, memberName };
      })
      .filter(({ record }) => {
        if (statusFilter === "ALL") return true;
        if (statusFilter === "PAID") return record.status === "PAID";

        // Paid status is handled above; for other filters we use due-date derived status.
        if (record.status === "PAID") return false;

        const derived = getInstallmentStatus(record);
        const normalized = derived === "DUE_SOON" ? "DUE" : derived;
        return normalized === statusFilter;
      });
  }, [defaultDueDay, installmentData?.data, statusFilter]);

  const loading = userLoading || settingsLoading || installmentsLoading;

  if (!isAdmin) {
    if (loading) return <Skeleton className="h-40 w-full" />;
    return (
      <div className="mx-auto max-w-6xl space-y-6 py-4">
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Access denied.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 py-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Installments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-[320px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Installment management</p>
          <h1 className="mt-1 text-3xl font-bold">Installments</h1>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-[220px]">
            <p className="text-xs text-muted-foreground mb-1">Month</p>
            <Select value={monthKey} onValueChange={setMonthKey}>
              <SelectTrigger>
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((opt) => (
                  <SelectItem key={opt.key} value={opt.key}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[220px]">
            <p className="text-xs text-muted-foreground mb-1">Status</p>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="DUE">Due</SelectItem>
                <SelectItem value="OVERDUE">Overdue</SelectItem>
                <SelectItem value="UPCOMING">Upcoming</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {([
              { key: "ALL", label: "All" },
              { key: "PAID", label: "Paid" },
              { key: "DUE", label: "Due" },
              { key: "OVERDUE", label: "Overdue" },
              { key: "UPCOMING", label: "Upcoming" },
            ] as Array<{ key: StatusFilter; label: string }>).map((s) => (
              <Button
                key={s.key}
                size="sm"
                variant={statusFilter === s.key ? "default" : "outline"}
                onClick={() => setStatusFilter(s.key)}
              >
                {s.label}
              </Button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Member</th>
                  <th className="pb-3 pr-4 font-medium">Period</th>
                  <th className="pb-3 pr-4 font-medium">Due date</th>
                  <th className="pb-3 pr-4 font-medium">Amount</th>
                  <th className="pb-3 pr-4 font-medium">Paid at</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                        {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      No installments found for this month.
                    </td>
                  </tr>
                ) : (
                        rows.map(({ record, memberName }) => {
                    const derived = record.status === "PAID" ? "PAID" : getInstallmentStatus(record);
                    const normalized = derived === "DUE_SOON" ? "DUE" : derived;

                    return (
                      <tr key={record.id} className="border-b last:border-0">
                        <td className="py-3 pr-4">{memberName ?? "Unknown member"}</td>
                        <td className="py-3 pr-4">{record.period}</td>
                        <td className="py-3 pr-4">{record.dueDate}</td>
                        <td className="py-3 pr-4">{currency(record.amount)}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{formatPaidAt(record.paidAt)}</td>
                        <td className="py-3">
                          <Badge variant={getStatusBadgeVariant(normalized)}>{String(normalized).toLowerCase().replace("_", " ")}</Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="text-sm text-muted-foreground">
            Showing {rows.length} installment{rows.length === 1 ? "" : "s"} for {monthOptions.find((m) => m.key === monthKey)?.label ?? monthKey}.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
