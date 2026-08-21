import { type InstallmentRecord } from "./installment-logic";

export type PaymentStatus =
  | "PENDING"
  | "PROCESSING"
  | "SUCCESS"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED";

export type PaymentMethod = "AamarPay" | "Cash" | "Bank" | "Other";

export type PaymentTransaction = {
  id: string;
  memberId: string;
  transactionId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  paymentGateway: string;
  gatewayTransactionId?: string;
  status: PaymentStatus;
  installmentIds: string[];
  paidAt: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, string | number | boolean>;
};

export const MONTHLY_INSTALLMENT_AMOUNT = 1000;
export const INSTALLMENT_HISTORY_FILTERS = ["ALL", "PAID", "DUE", "OVERDUE", "UPCOMING"] as const;

export const memberInstallments: InstallmentRecord[] = [
  {
    id: "mar-2026",
    memberId: "member-1001",
    period: "2026-03",
    dueDate: "2026-03-25",
    amount: 1000,
    status: "PAID",
    paymentTransactionId: "TXN-10001",
    paidAt: "2026-03-26T10:30:00.000Z",
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-26T10:30:00.000Z",
  },
  {
    id: "apr-2026",
    memberId: "member-1001",
    period: "2026-04",
    dueDate: "2026-04-25",
    amount: 1000,
    status: "UNPAID",
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
  },
  {
    id: "may-2026",
    memberId: "member-1001",
    period: "2026-05",
    dueDate: "2026-05-25",
    amount: 1000,
    status: "UNPAID",
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
  },
  {
    id: "jun-2026",
    memberId: "member-1001",
    period: "2026-06",
    dueDate: "2026-06-25",
    amount: 1000,
    status: "UNPAID",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "jul-2026",
    memberId: "member-1001",
    period: "2026-07",
    dueDate: "2026-07-25",
    amount: 1000,
    status: "UNPAID",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  },
  {
    id: "aug-2026",
    memberId: "member-1001",
    period: "2026-08",
    dueDate: "2026-08-25",
    amount: 1000,
    status: "UNPAID",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  },
  {
    id: "sep-2026",
    memberId: "member-1001",
    period: "2026-09",
    dueDate: "2026-09-25",
    amount: 1000,
    status: "UNPAID",
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  },
  {
    id: "oct-2026",
    memberId: "member-1001",
    period: "2026-10",
    dueDate: "2026-10-25",
    amount: 1000,
    status: "UNPAID",
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
  },
];

export const paymentTransactions: PaymentTransaction[] = [
  {
    id: "txn-10001",
    memberId: "member-1001",
    transactionId: "TXN-10001",
    amount: 2000,
    currency: "BDT",
    paymentMethod: "AamarPay",
    paymentGateway: "AamarPay",
    gatewayTransactionId: "AP-1001",
    status: "SUCCESS",
    installmentIds: ["jan-2026", "feb-2026"],
    paidAt: "2026-02-10T12:00:00.000Z",
    createdAt: "2026-02-10T12:00:00.000Z",
    updatedAt: "2026-02-10T12:00:00.000Z",
    metadata: { installments: 2 },
  },
  {
    id: "txn-10002",
    memberId: "member-1001",
    transactionId: "TXN-10002",
    amount: 1000,
    currency: "BDT",
    paymentMethod: "Cash",
    paymentGateway: "Offline",
    status: "SUCCESS",
    installmentIds: ["mar-2026"],
    paidAt: "2026-03-26T10:30:00.000Z",
    createdAt: "2026-03-26T10:30:00.000Z",
    updatedAt: "2026-03-26T10:30:00.000Z",
    metadata: { installments: 1 },
  },
];
