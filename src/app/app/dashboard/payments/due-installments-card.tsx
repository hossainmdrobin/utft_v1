"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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

  const dueInstallments = dueInstallmentsData?.data ?? [];

  const totalSelectedAmount = useMemo(
    () =>
      dueInstallments
        .filter((installment) => selectedIds.includes(String(installment._id)))
        .reduce((sum, installment) => sum + Number(installment.amount ?? 0), 0),
    [dueInstallments, selectedIds],
  );

  const toggleInstallmentSelection = (installmentId: string) => {
    setSelectedIds((current) =>
      current.includes(installmentId)
        ? current.filter((id) => id !== installmentId)
        : [...current, installmentId],
    );
  };

  const handlePaySelectedDueInstallments = () => {
    if (!memberId || selectedIds.length === 0) return;

    const selectedInstallments = dueInstallments.filter((installment) =>
      selectedIds.includes(String(installment._id)),
    );

    const validInstallments = selectedInstallments.filter((installment) => {
      const amount = Number(installment.amount ?? 0);
      return Number.isFinite(amount) && amount > 0;
    });

    if (validInstallments.length === 0) return;

    const paymentAmount = validInstallments.reduce((sum, installment) => sum + Number(installment.amount ?? 0), 0);

    createAamarPayPayment({
      amount: paymentAmount,
      description: `Due installment payment (${validInstallments.length} items)`,
      name: currentUserData?.data?.full_name || "Member",
      status: "due",
      installments: validInstallments.map((installment) => ({
        month: Number(installment.month ?? month),
        year: Number(installment.year ?? year),
        day: Number(installment.day ?? day),
      })),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-primary" />
          Due installments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading due installments...</p>
        ) : isError ? (
          <p className="text-sm text-red-600">
            {"message" in (error ?? {}) ? String((error as { message?: string }).message) : "Failed to load due installments."}
          </p>
        ) : dueInstallments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No installments are currently due.</p>
        ) : (
          <>
            <div className="space-y-3">
              {dueInstallments.map((installment) => {
                const installmentId = String(installment._id ?? `${installment.month}-${installment.year}`);
                const isSelected = selectedIds.includes(installmentId);

                return (
                  <label
                    key={installmentId}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleInstallmentSelection(installmentId)}
                        className="h-4 w-4"
                      />
                      <div>
                        <p className="font-medium">
                          {monthArray[(Number(installment.month ?? month) - 1 + 12) % 12]} {installment.year ?? year}
                        </p>
                        <p className="text-xs text-muted-foreground">Due day: {installment.day ?? day}</p>
                      </div>
                    </div>
                    <span className="font-semibold">{currency(Number(installment.amount ?? 0))}</span>
                  </label>
                );
              })}
            </div>

            <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Selected installments</p>
                <p className="text-xl font-semibold">{selectedIds.length} item(s)</p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{currency(totalSelectedAmount)}</p>
              </div>
              <Button
                onClick={handlePaySelectedDueInstallments}
                disabled={selectedIds.length === 0 || isPaying || !memberId}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {isPaying ? "Processing..." : `Pay ${currency(totalSelectedAmount)}`}
              </Button>
            </div>
          </>
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
