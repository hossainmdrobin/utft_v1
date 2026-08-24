import { CircleDollarSign, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { InstallmentRecord } from "./installment-logic";

type AdvanceInstallmentsCardProps = {
    installments: InstallmentRecord[];
    selectedInstallmentIds: string[];
    advanceTotal: number;
    currency: (amount: number) => string;
    formatMonthLabel: (period: string) => string;
    formatDueDate: (date: string) => string;
    onToggleSelection: (installmentId: string) => void;
    onAdvancePay: () => void;
};

export function AdvanceInstallmentsCard({
    installments,
    selectedInstallmentIds,
    advanceTotal,
    currency,
    formatMonthLabel,
    formatDueDate,
    onToggleSelection,
    onAdvancePay,
}: AdvanceInstallmentsCardProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><CircleDollarSign className="h-5 w-5 text-primary" /> Pay future installments in advance</CardTitle>
                <CardDescription>
                    Select unpaid future installments and pay them together. Only unpaid future records are eligible.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                    {installments.map((installment) => (
                        <label key={installment.id} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3">
                            <div className="flex items-center gap-3">
                                <input type="checkbox" checked={selectedInstallmentIds.includes(installment.id)} onChange={() => onToggleSelection(installment.id)} className="h-4 w-4 accent-primary" />
                                <div>
                                    <p className="font-medium">{formatMonthLabel(installment.period)}</p>
                                    <p className="text-sm text-muted-foreground">{formatDueDate(installment.dueDate)}</p>
                                </div>
                            </div>
                            <span className="font-medium">{currency(installment.amount)}</span>
                        </label>
                    ))}
                </div>

                <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">Selected installments</p>
                        <p className="text-xl font-semibold">{selectedInstallmentIds.length} items</p>
                    </div>
                    <div className="text-left sm:text-right">
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="text-2xl font-bold">{currency(advanceTotal)}</p>
                    </div>
                    <Button onClick={onAdvancePay} disabled={selectedInstallmentIds.length === 0}>
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Pay {currency(advanceTotal)}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
