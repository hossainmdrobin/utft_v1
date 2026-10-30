import { CircleDollarSign, Minus, Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentDhakaDate, monthArray } from "@/lib/date/dhaka";
import {  useState } from "react";
import { useGetSettingsQuery } from "@/store/slices/settingSlice/api.setting";
import { useCreateAamarPayPaymentMutation } from "@/store/slices/paymentSlice/api.slice";
import { useCreateManualInstallmentMutation, useGetInstallmentsByMemberIdQuery } from "@/store/slices/installmentSlice/api.installment";
import { useParams } from "next/navigation";
import SingleInstallmentCard from "./SingleInstallmentCard";

export function NewInstallments() {
    const params = useParams();
    const id = params.id as string;
    const { month, year } = getCurrentDhakaDate()
    const { data: settings } = useGetSettingsQuery()
    const { data } = useGetInstallmentsByMemberIdQuery({ id })
    const [createManualInstallment] = useCreateManualInstallmentMutation()

    const lastInstallmentThisYear = (data || [])
        .filter(item => item.year == year && item.payment_status == 'paid')
        .sort(function (a, b) { return b.month - a.month })[0]

    const getInstallments = (count: number) => Array.from({ length: count }, (_, index) => {
        const maxMonth = Math.max(month, lastInstallmentThisYear?.month || 0)
        const monthNumber = maxMonth + 1 + index;
        const temp_month = monthNumber % 12;
        const temp_year = year + Math.floor(monthNumber / 12);

        return {
            month: temp_month,
            year: temp_year,
            status: month == monthNumber - 1 ? "regular" : "advance",
            amount: settings?.data?.share_value || 0
        }
    })

    const [installments, setInstallments] = useState(() => getInstallments(1))
    const setInstallmentCount = (count: number) => {
        setInstallments(getInstallments(Math.max(1, count)))
    }

    const handleAdvancePayment = () => {
        console.log("Clicked")
        createManualInstallment({
            member: id,
            data: installments
        })
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><CircleDollarSign className="h-5 w-5 text-primary" /> Record New Installments</CardTitle>
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
                        <p className="text-xl font-semibold">{installments.length} Installmest</p>
                    </div>
                    <div className="text-left sm:text-right">
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="text-2xl font-bold">{(settings?.data?.share_value || 0) * installments.length}</p>
                    </div>
                    <Button
                        onClick={handleAdvancePayment}
                        disabled={installments.length === 0}>
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Pay tatal {(settings?.data?.share_value || 1) * installments.length}
                    </Button>
                </div>
            </CardContent>
            <CardContent>
                <CardTitle className="flex items-center gap-2"><CircleDollarSign className="h-5 w-5 text-primary" /> Due Intallments</CardTitle>
                <CardDescription>Installments are missed to pay before deadline</CardDescription>
                {data && <div>{
                    data?.filter(item => item.status == "due").map(item => <SingleInstallmentCard />)
                }
                </div>}
            </CardContent>
        </Card>
    );
}
