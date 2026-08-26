"use client";

import { useEffect } from "react";
import { AlertTriangle, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetCurrentUserQuery } from "@/store/slices/authSlice/api.auth";
import {
  useCreateAamarPayPaymentMutation,
  useGetInstallmentQuery,
} from "@/store/slices/paymentSlice/api.slice";
import { getCurrentDhakaDate, monthArray } from "@/lib/date/dhaka";

type DueInstallment = {
  _id?: string;
  member?: string;
  month?: number;
  year?: number;
  day?: number;
  amount?: number;
  status?: string;
  transaction_id?: string;
};

type DueInstallmentsCardProps = {
  currency: (amount: number) => string;
};

export function DueInstallmentsCard({ currency }: DueInstallmentsCardProps) {
  const { day, month, year } = getCurrentDhakaDate();
  const { data: currentUserData } = useGetCurrentUserQuery();
  const memberId = currentUserData?.data?._id;

  const {
    data: dueInstallmentsData,
    isLoading,
    isError,
    error,
  } = useGetInstallmentQuery({ member: String(memberId), status: "due" }, { skip: !memberId });

  const [createAamarPayPayment, { data: paymentData, isLoading: isPaying, error: paymentError }] =
    useCreateAamarPayPaymentMutation();

  useEffect(() => {
    if (paymentData?.paymentUrl) {
      window.location.replace(paymentData.paymentUrl);
    }
  }, [paymentData]);

  const handlePayDueInstallment = (installment: DueInstallment) => {
    if (!memberId) return;

    const paymentAmount = Number(installment.amount ?? 0);
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) return;

    const installmentMonth = Number(installment.month ?? month);
    const installmentYear = Number(installment.year ?? year);
    const installmentDay = Number(installment.day ?? day);

    createAamarPayPayment({
      amount: paymentAmount,
      description: `Due installment payment for ${monthArray[(installmentMonth - 1 + 12) % 12]} ${installmentYear}`,
      name: currentUserData?.data?.full_name || "Member",
      status: "due",
      installments: [{ month: installmentMonth, year: installmentYear, day: installmentDay }],
    });
  };

  const dueInstallments = dueInstallmentsData?.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-primary" />
          Due installments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading due installments...</p>
        ) : isError ? (
          <p className="text-sm text-red-600">
            {"message" in (error ?? {}) ? String((error as { message?: string }).message) : "Failed to load due installments."}
          </p>
        ) : dueInstallments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No installments are currently due.</p>
        ) : (
          dueInstallments.map((installment) => (
            <div key={installment._id} className="rounded-lg border p-3">
              <p className="font-medium">
                {monthArray[(Number(installment.month ?? month) - 1 + 12) % 12]} {installment.year ?? year}
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{currency(Number(installment.amount ?? 0))}</p>
                  <p className="text-xs text-muted-foreground">Due day: {installment.day ?? day}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handlePayDueInstallment(installment)}
                  disabled={isPaying || !memberId}
                >
                  {isPaying ? "Processing..." : "Pay"}
                </Button>
              </div>
            </div>
          ))
        )}

        {paymentError && (
          <p className="text-sm text-red-600">
            {"message" in paymentError ? String((paymentError as { message?: string }).message) : "Payment initialization failed."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
