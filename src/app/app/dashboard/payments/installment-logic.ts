export type InstallmentStatus = "UPCOMING" | "DUE_SOON" | "DUE" | "OVERDUE" | "PAID";

export type InstallmentRecord = {
  id: string;
  memberId: string;
  period: string;
  dueDate: string;
  amount: number;
  status: "UNPAID" | "PAID";
  paymentTransactionId?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type FinancialSummary = {
  monthlyInstallment: number;
  totalInstallmentsGenerated: number;
  paidInstallments: number;
  dueInstallments: number;
  upcomingInstallments: number;
  totalPaidAmount: number;
  totalDueAmount: number;
  upcomingAmount: number;
  totalFineAmount: number;
  fineInstallments: number;
};

export type FinePolicy = {
  enabled?: boolean;
  fine_enabled?: boolean;
  fineType?: "fixed" | "percentage";
  fine_type?: "fixed" | "percentage";
  fineValue?: number;
  fine_value?: number;
  amount?: number;
  gracePeriodDays?: number;
  grace_period_days?: number;
  isCumulative?: boolean;
  is_cumulative?: boolean;
  cumulativeFrequency?: "daily" | "weekly" | "monthly" | null;
  cumulative_frequency?: "daily" | "weekly" | "monthly" | null;
  maxFineAmount?: number | null;
  max_fine_amount?: number | null;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;
export const INSTALLMENT_WARNING_DAYS = 5;
export const FINE_PER_INSTALLMENT = 100;

export function normalizeDate(date: string | Date): Date {
  const value = typeof date === "string" ? new Date(date) : date;
  return new Date(value.getTime());
}

export function getInstallmentStatus(installment: InstallmentRecord, currentDate: string | Date = new Date()): InstallmentStatus {
  if (installment.status === "PAID") {
    return "PAID";
  }

  const dueDate = normalizeDate(installment.dueDate);
  const today = normalizeDate(currentDate);
  const diffInDays = Math.ceil((dueDate.getTime() - today.getTime()) / DAY_IN_MS);

  if (diffInDays > INSTALLMENT_WARNING_DAYS) {
    return "UPCOMING";
  }
  if (diffInDays > 0) {
    return "DUE_SOON";
  }
  if (diffInDays === 0) {
    return "DUE";
  }

  return "OVERDUE";
}

function normalizePolicy(policy?: FinePolicy): {
  enabled: boolean;
  fineType: "fixed" | "percentage";
  fineValue: number;
  gracePeriodDays: number;
  isCumulative: boolean;
  cumulativeFrequency: "daily" | "weekly" | "monthly";
  maxFineAmount: number | null;
} {
  const enabled = policy?.enabled ?? policy?.fine_enabled ?? true;
  const fineType = (policy?.fineType ?? policy?.fine_type ?? "fixed") as "fixed" | "percentage";
  const fineValue = policy?.fineValue ?? policy?.fine_value ?? policy?.amount ?? FINE_PER_INSTALLMENT;
  const gracePeriodDays = policy?.gracePeriodDays ?? policy?.grace_period_days ?? 5;
  const isCumulative = policy?.isCumulative ?? policy?.is_cumulative ?? true;
  const cumulativeFrequency = (policy?.cumulativeFrequency ?? policy?.cumulative_frequency ?? "monthly") as
    | "daily"
    | "weekly"
    | "monthly";
  const maxFineAmount = policy?.maxFineAmount ?? policy?.max_fine_amount ?? null;

  return {
    enabled,
    fineType,
    fineValue,
    gracePeriodDays,
    isCumulative,
    cumulativeFrequency,
    maxFineAmount,
  };
}

function resolveFineArgs(
  currentDateOrPolicy?: string | Date | FinePolicy,
  policy?: FinePolicy,
): { currentDate: string | Date; policy?: FinePolicy } {
  const isDate = (v: unknown) => typeof v === "string" || v instanceof Date;
  if (isDate(currentDateOrPolicy)) {
    if (policy && isDate(policy)) {
      // policy actually a date passed in second position? handle swapped
    }
    return { currentDate: currentDateOrPolicy as string | Date, policy };
  }
  if (currentDateOrPolicy && typeof currentDateOrPolicy === "object") {
    if (policy && isDate(policy)) {
      return { currentDate: policy as string | Date, policy: currentDateOrPolicy as FinePolicy };
    }
    return { currentDate: new Date(), policy: currentDateOrPolicy as FinePolicy };
  }
  return { currentDate: new Date(), policy };
}

export function calculatePerInstallmentFine(
  installment: InstallmentRecord,
  currentDateOrPolicy?: string | Date | FinePolicy,
  policy?: FinePolicy,
): number {
  const { currentDate, policy: resolvedPolicy } = resolveFineArgs(currentDateOrPolicy, policy);
  const normalizedPolicy = normalizePolicy(resolvedPolicy);

  if (!normalizedPolicy.enabled) return 0;
  if (installment.status === "PAID") return 0;

  const dueDate = normalizeDate(installment.dueDate);
  const today = normalizeDate(currentDate);

  const dueMidnight = new Date(Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate()));
  const todayMidnight = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const daysOverdue = Math.floor((todayMidnight.getTime() - dueMidnight.getTime()) / DAY_IN_MS);

  if (daysOverdue <= normalizedPolicy.gracePeriodDays) return 0;

  const daysBeyondGrace = daysOverdue - normalizedPolicy.gracePeriodDays;

  let baseFine = 0;
  if (normalizedPolicy.fineType === "percentage") {
    baseFine = installment.amount * (normalizedPolicy.fineValue / 100);
  } else {
    baseFine = normalizedPolicy.fineValue;
  }

  let periods = 1;
  if (normalizedPolicy.isCumulative && daysBeyondGrace > 0) {
    switch (normalizedPolicy.cumulativeFrequency) {
      case "daily":
        periods = daysBeyondGrace;
        break;
      case "weekly":
        periods = Math.ceil(daysBeyondGrace / 7);
        break;
      case "monthly":
        periods = Math.ceil(daysBeyondGrace / 30);
        break;
      default:
        periods = 1;
    }
  }

  let fine = baseFine * periods;

  if (normalizedPolicy.maxFineAmount !== null && normalizedPolicy.maxFineAmount !== undefined && fine > normalizedPolicy.maxFineAmount) {
    fine = normalizedPolicy.maxFineAmount;
  }

  return fine;
}

export function calculateFinancialSummary(
  installments: InstallmentRecord[],
  currentDateOrPolicy?: string | Date | FinePolicy,
  policy?: FinePolicy,
): FinancialSummary {
  const { currentDate, policy: resolvedPolicy } = resolveFineArgs(currentDateOrPolicy, policy);
  const normalizedPolicy = normalizePolicy(resolvedPolicy);

  const monthlyInstallment = installments[0]?.amount ?? 0;
  const paidInstallments = installments.filter((installment) => installment.status === "PAID").length;
  const dueInstallments = installments.filter((installment) => {
    if (installment.status === "PAID") return false;
    const status = getInstallmentStatus(installment, currentDate);
    return status === "DUE" || status === "OVERDUE";
  }).length;
  const upcomingInstallments = installments.filter((installment) => {
    if (installment.status === "PAID") return false;
    const status = getInstallmentStatus(installment, currentDate);
    return status === "UPCOMING" || status === "DUE_SOON";
  }).length;
  const totalPaidAmount = installments
    .filter((installment) => installment.status === "PAID")
    .reduce((total, installment) => total + installment.amount, 0);
  const totalDueAmount = installments
    .filter((installment) => installment.status !== "PAID")
    .reduce((total, installment) => total + installment.amount, 0);
  const upcomingAmount = installments
    .filter((installment) => {
      if (installment.status === "PAID") return false;
      const status = getInstallmentStatus(installment, currentDate);
      return status === "UPCOMING" || status === "DUE_SOON";
    })
    .reduce((total, installment) => total + installment.amount, 0);
  const fineInstallments = installments.filter((installment) => calculatePerInstallmentFine(installment, currentDate, resolvedPolicy) > 0).length;
  const totalFineAmount = installments.reduce((total, installment) => total + calculatePerInstallmentFine(installment, currentDate, resolvedPolicy), 0);

  return {
    monthlyInstallment,
    totalInstallmentsGenerated: installments.length,
    paidInstallments,
    dueInstallments,
    upcomingInstallments,
    totalPaidAmount,
    totalDueAmount,
    upcomingAmount,
    totalFineAmount,
    fineInstallments,
  };
}

export function applyInstallmentPayment(
  installments: InstallmentRecord[],
  installmentIds: string[],
  paymentTransactionId: string,
  paidAt: string | Date = new Date(),
): InstallmentRecord[] {
  const selectedIds = new Set(installmentIds);

  return installments.map((installment) => {
    if (!selectedIds.has(installment.id) || installment.status === "PAID") {
      return installment;
    }

    return {
      ...installment,
      status: "PAID",
      paidAt: typeof paidAt === "string" ? paidAt : paidAt.toISOString(),
      paymentTransactionId,
      updatedAt: typeof paidAt === "string" ? paidAt : paidAt.toISOString(),
    };
  });
}

export function mapInstallmentToRecord(doc: Record<string, unknown>, defaultDueDay: number = 10): InstallmentRecord {
  const month = Number(doc?.month ?? 0);
  const year = Number(doc?.year ?? 0);
  const day = Number(doc?.day ?? defaultDueDay ?? 10);
  const dueDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const isPaid = Boolean(doc?.transaction_id) || doc?.payment_status === "paid" || String(doc?.status ?? "").toLowerCase() === "paid";
  return {
    id: String(doc?._id ?? doc?.id ?? `${year}-${month}`),
    memberId: String(doc?.member ?? doc?.memberId ?? doc?.member_id ?? ""),
    period: `${year}-${String(month).padStart(2, "0")}`,
    dueDate,
    amount: Number(doc?.amount ?? 0),
    status: isPaid ? "PAID" : "UNPAID",
    paymentTransactionId: doc?.transaction_id as string | undefined,
    paidAt: (doc?.paid_at ?? doc?.paidAt ?? (isPaid ? doc?.updated_at ?? doc?.date : undefined)) as string | undefined,
    createdAt: (doc?.created_at ?? doc?.createdAt ?? new Date().toISOString()) as string,
    updatedAt: (doc?.updated_at ?? doc?.updatedAt ?? new Date().toISOString()) as string,
  };
}
