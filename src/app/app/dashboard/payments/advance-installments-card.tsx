import { CircleDollarSign, Minus, Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentDhakaDate, monthArray } from "@/lib/date/dhaka";
import { useEffect, useState } from "react";
import { useGetSettingsQuery } from "@/store/slices/settingSlice/api.setting";
import { useCreateAamarPayPaymentMutation } from "@/store/slices/paymentSlice/api.slice";

type AdvanceInstallmentsCardProps = {
    currency: (amount: number) => string;
};

export function AdvanceInstallmentsCard({
    currency,
}: AdvanceInstallmentsCardProps) {
    const { month, year } = getCurrentDhakaDate()
    const { data: settings } = useGetSettingsQuery()

    const getInstallments = (count: number) => Array.from({ length: count }, (_, index) => {
        const monthNumber = month + 1 + index

        return {
            month: monthNumber % 12,
            year: year + Math.floor(monthNumber / 12),
        }
    })

    const [installments, setInstallments] = useState(() => getInstallments(1))
    const [createInstallment, { data: newInstallmentData, error, isLoading }] = useCreateAamarPayPaymentMutation()
    console.log('advacne payerror:', newInstallmentData, error, isLoading)
    const setInstallmentCount = (count: number) => {
        setInstallments(getInstallments(Math.max(1, count)))
    }

    const handleAdvancePayment = () => {
        createInstallment({
            installments,
            amount: installments.length * (settings?.data?.share_value || 0),
            description: "Advanced Payment",
            status: "advance",
        })
    }
    useEffect(() => {
        if (newInstallmentData) {
            window.location.replace(newInstallmentData.paymentUrl);
        }
    }, [newInstallmentData])
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><CircleDollarSign className="h-5 w-5 text-primary" /> Pay future installments in advance</CardTitle>
                <div className="flex justify-between">
                    <CardDescription>
                        Select unpaid future installments and pay them together. Only unpaid future records are eligible.
                    </CardDescription>
                    <Button
                        onClick={() => setInstallmentCount(1)}
                        className=""
                    >Reset</Button>

                </div>

            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                    <div className="flex flex-col gap-3 rounded-lg border p-4">
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-medium">Number of months</span>
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setInstallmentCount(installments.length - 1)}
                                    disabled={installments.length === 1}
                                    aria-label="Select one fewer month"
                                >
                                    <Minus className="h-4 w-4" />
                                </Button>
                                <span className="min-w-8 text-center text-lg font-semibold">{installments.length}</span>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setInstallmentCount(installments.length + 1)}
                                    aria-label="Select one more month"
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {[2, 3, 6].map((count) => (
                                <Button
                                    key={count}
                                    type="button"
                                    variant={installments.length === count ? "default" : "outline"}
                                    onClick={() => setInstallmentCount(count)}
                                >
                                    {count} months
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">Selected installments</p>
                        <p className="text-xl font-semibold">{installments.length} items</p>
                    </div>
                    <div className="text-left sm:text-right">
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="text-2xl font-bold">{currency((settings?.data?.share_value || 0) * installments.length)}</p>
                    </div>
                    <Button
                        onClick={handleAdvancePayment}
                        disabled={installments.length === 0}>
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Pay {currency((settings?.data?.share_value || 0) * installments.length)}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
