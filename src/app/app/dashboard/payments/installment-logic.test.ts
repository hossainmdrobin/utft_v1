import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  calculateFinancialSummary,
  getInstallmentStatus,
  applyInstallmentPayment,
  type InstallmentRecord,
} from "./installment-logic";

describe("installment logic", () => {
  it("calculates due and paid statuses from the payment and due date", () => {
    const installment: InstallmentRecord = {
      id: "inst-1",
      memberId: "member-1",
      period: "2026-08",
      dueDate: "2026-08-25",
      amount: 1000,
      status: "UNPAID",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    };

    assert.equal(getInstallmentStatus(installment, "2026-08-23T12:00:00.000Z"), "DUE_SOON");
    assert.equal(getInstallmentStatus(installment, "2026-08-26T12:00:00.000Z"), "OVERDUE");

    const paidInstallment: InstallmentRecord = {
      ...installment,
      status: "PAID",
      paidAt: "2026-08-25T10:00:00.000Z",
      paymentTransactionId: "txn-1",
    };

    assert.equal(getInstallmentStatus(paidInstallment, "2026-08-26T12:00:00.000Z"), "PAID");
  });

  it("calculates the summary from actual installment data", () => {
    const installments: InstallmentRecord[] = [
      { id: "a", memberId: "member-1", period: "2026-01", dueDate: "2026-01-25", amount: 1000, status: "PAID", paidAt: "2026-01-26T00:00:00.000Z", paymentTransactionId: "txn-a", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-26T00:00:00.000Z" },
      { id: "b", memberId: "member-1", period: "2026-02", dueDate: "2026-02-25", amount: 1000, status: "PAID", paidAt: "2026-02-27T00:00:00.000Z", paymentTransactionId: "txn-b", createdAt: "2026-02-01T00:00:00.000Z", updatedAt: "2026-02-27T00:00:00.000Z" },
      { id: "c", memberId: "member-1", period: "2026-03", dueDate: "2026-03-25", amount: 1000, status: "UNPAID", createdAt: "2026-03-01T00:00:00.000Z", updatedAt: "2026-03-01T00:00:00.000Z" },
      { id: "d", memberId: "member-1", period: "2026-04", dueDate: "2026-04-25", amount: 1000, status: "UNPAID", createdAt: "2026-04-01T00:00:00.000Z", updatedAt: "2026-04-01T00:00:00.000Z" },
    ];

    const summary = calculateFinancialSummary(installments, "2026-05-01T00:00:00.000Z");

    assert.equal(summary.totalPaidAmount, 2000);
    assert.equal(summary.paidInstallments, 2);
    assert.equal(summary.totalDueAmount, 2000);
    assert.equal(summary.dueInstallments, 2);
    assert.equal(summary.upcomingInstallments, 0);
  });

  it("marks selected future installments as paid when a payment is confirmed", () => {
    const installments: InstallmentRecord[] = [
      { id: "sept", memberId: "member-1", period: "2026-09", dueDate: "2026-09-25", amount: 1000, status: "UNPAID", createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z" },
      { id: "oct", memberId: "member-1", period: "2026-10", dueDate: "2026-10-25", amount: 1000, status: "UNPAID", createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z" },
    ];

    const result = applyInstallmentPayment(installments, ["sept", "oct"], "txn-advance", "2026-08-15T00:00:00.000Z");

    assert.equal(result.length, 2);
    assert.equal(result[0].status, "PAID");
    assert.equal(result[0].paymentTransactionId, "txn-advance");
    assert.equal(result[1].status, "PAID");
    assert.equal(result[1].paymentTransactionId, "txn-advance");
  });
});
