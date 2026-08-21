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

export function calculatePerInstallmentFine(installment: InstallmentRecord, currentDate: string | Date = new Date()): number {
  if (installment.status === "PAID") {
    return 0;
  }

  const status = getInstallmentStatus(installment, currentDate);
  if (status === "DUE" || status === "OVERDUE") {
    return FINE_PER_INSTALLMENT;
  }

  return 0;
}

export function calculateFinancialSummary(installments: InstallmentRecord[], currentDate: string | Date = new Date()): FinancialSummary {
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
  const fineInstallments = installments.filter((installment) => calculatePerInstallmentFine(installment, currentDate) > 0).length;
  const totalFineAmount = installments.reduce((total, installment) => total + calculatePerInstallmentFine(installment, currentDate), 0);

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
