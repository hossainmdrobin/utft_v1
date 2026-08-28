import { CircleDollarSign, Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentDhakaDate, monthArray } from "@/lib/date/dhaka";
import { useEffect, useState } from "react";
import { useGetSettingsQuery } from "@/store/slices/settingSlice/api.setting";
import { useCreateAamarPayPaymentMutation } from "@/store/slices/paymentSlice/api.slice";
import { url } from "inspector";

type AdvanceInstallmentsCardProps = {
    currency: (amount: number) => string;
};

export function AdvanceInstallmentsCard({
    currency,
}: AdvanceInstallmentsCardProps) {
    const { month, year } = getCurrentDhakaDate()
    const { data: settings } = useGetSettingsQuery()

    const [installments, setInstallments] = useState([{ month: (month + 1) % 12, year: (month + 1) > 12 ? year + 1 : year }])
    const [createInstallment, { data: newInstallmentData, error, isLoading }] = useCreateAamarPayPaymentMutation()
    console.log('advacne payerror:', newInstallmentData, error, isLoading)
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
                        onClick={() => setInstallments([{ month: (month + 1) % 12, year: (month + 1) > 12 ? year + 1 : year }])}
                        className=""
                    >Reset</Button>

                </div>

            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                    {
                        installments.map((item, i) => (
                            <label
                                onClick={() => setInstallments(installments.filter((_, index) => i != index))}
                                key={i} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3">
                                <div className="flex items-center gap-3">
                                    <input type="checkbox" checked />
                                    <div>
                                        <p className="font-medium">{monthArray[item.month] + " " + item.year}</p>
                                        <p className="text-sm text-muted-foreground">{item.year}</p>
                                    </div>
                                </div>
                                <span className="font-medium">{currency(settings?.data?.share_value || 0)}</span>
                            </label>)
                        )
                    }
                    <Button
                        onClick={() => setInstallments([...installments, { month: (month + 1 + installments.length) % 12, year: year + Math.floor((month + 1 + installments.length) / 12) }])}
                        className="flex cursor-pointer items-center justify-center gap-3 rounded-lg border p-8">
                        <Plus className="mr-2 h-4 w-4" />
                        <span>Add Another Installment </span>
                        <span>{currency(settings?.data?.share_value || 0)}</span>
                    </Button>
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
