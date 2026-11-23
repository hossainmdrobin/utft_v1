"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Save } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useGetAccountsQuery } from "@/store/slices/accountSlice/api.account";
import type { AccountDoc } from "@/models/Account";
import type { SettingDoc } from "@/models/settingAndStates";

function isValidObjectIdString(v: string) {
  return /^[a-fA-F0-9]{24}$/.test(v);
}

const installmentAccountingSchema = z.object({
  debitAccount: z
    .string()
    .min(1, "Debit account is required")
    .refine((v) => isValidObjectIdString(v), "Invalid debit account id"),
  creditAccount: z
    .string()
    .min(1, "Credit account is required")
    .refine((v) => isValidObjectIdString(v), "Invalid credit account id"),
});

type InstallmentAccountingValues = z.infer<typeof installmentAccountingSchema>;

interface InstallmentAccountingConfigurationSectionProps {
  settings: SettingDoc | undefined;
  onUpdate: (value: Record<string, unknown>) => Promise<void>;
  isAdmin: boolean;
  isSaving: boolean;
}

export function InstallmentAccountingConfigurationSection({
  settings,
  onUpdate,
  isAdmin,
  isSaving,
}: InstallmentAccountingConfigurationSectionProps) {
  const [debitSearch, setDebitSearch] = useState("");
  const [creditSearch, setCreditSearch] = useState("");

  const { data: debitAccountsData, isLoading: debitLoading } = useGetAccountsQuery({
    type: "asset",
    isActive: true,
  });
  const { data: liabilityAccountsData, isLoading: liabilityLoading } = useGetAccountsQuery({
    type: "liability",
    isActive: true,
  });
  const { data: equityAccountsData, isLoading: equityLoading } = useGetAccountsQuery({
    type: "equity",
    isActive: true,
  });

  const debitAccounts: AccountDoc[] = debitAccountsData?.data ?? [];

  const creditAccounts: AccountDoc[] = useMemo(() => {
    const liability = liabilityAccountsData?.data ?? [];
    const equity = equityAccountsData?.data ?? [];
    const map = new Map<string, AccountDoc>();
    for (const acc of [...liability, ...equity]) map.set(String(acc._id), acc);
    return Array.from(map.values());
  }, [liabilityAccountsData, equityAccountsData]);

  const config = settings?.installmentAccounting;
  const initialDebit = config?.debitAccount ? String(config.debitAccount) : "";
  const initialCredit = config?.creditAccount ? String(config.creditAccount) : "";

  const form = useForm<InstallmentAccountingValues>({
    resolver: zodResolver(installmentAccountingSchema),
    defaultValues: {
      debitAccount: initialDebit,
      creditAccount: initialCredit,
    },
  });

  // Keep the form in sync when settings load/refresh.
  useEffect(() => {
    form.setValue("debitAccount", initialDebit);
    form.setValue("creditAccount", initialCredit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDebit, initialCredit]);

  const selectedDebit = form.watch("debitAccount");
  const selectedCredit = form.watch("creditAccount");

  const selectedDebitAcc = debitAccounts.find((a) => String(a._id) === selectedDebit);
  const selectedCreditAcc = creditAccounts.find((a) => String(a._id) === selectedCredit);

  const isDebitValid = Boolean(selectedDebitAcc?.isActive && selectedDebitAcc?.type === "asset");
  const isCreditValid =
    Boolean(selectedCreditAcc?.isActive && (selectedCreditAcc?.type === "liability" || selectedCreditAcc?.type === "equity"));
  const isDifferentAccounts = selectedDebit && selectedCredit && selectedDebit !== selectedCredit;

  const accountsLoading = debitLoading || liabilityLoading || equityLoading;
  const canSave =
    isAdmin &&
    !accountsLoading &&
    !isSaving &&
    Boolean(selectedDebit && selectedCredit) &&
    isDebitValid &&
    isCreditValid &&
    Boolean(isDifferentAccounts);

  const filteredDebitAccounts = useMemo(() => {
    const q = debitSearch.trim().toLowerCase();
    if (!q) return debitAccounts;
    return debitAccounts.filter((acc) =>
      [acc.code ?? "-", acc.name].some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [debitAccounts, debitSearch]);

  const filteredCreditAccounts = useMemo(() => {
    const q = creditSearch.trim().toLowerCase();
    if (!q) return creditAccounts;
    return creditAccounts.filter((acc) =>
      [acc.code ?? "-", acc.name].some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [creditAccounts, creditSearch]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">Installment Accounting Configuration</CardTitle>
        <CardDescription>
          Configure which Chart of Accounts entries are used for monthly installment journal transactions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(async (values) => {
              if (!canSave) return;
              if (values.debitAccount === values.creditAccount) {
                toast.error("Debit and credit accounts must be different");
                return;
              }
              try {
                await onUpdate({
                  installmentAccounting: {
                    debitAccount: values.debitAccount,
                    creditAccount: values.creditAccount,
                  },
                });
                toast.success("Installment accounting configuration saved");
              } catch (e) {
                toast.error((e as Error)?.message || "Failed to save configuration");
              }
            })}
            className="space-y-4"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="debitAccount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Installment Debit Account</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!isAdmin || accountsLoading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select debit account" />
                        </SelectTrigger>
                        <SelectContent>
                          <div className="p-1">
                            <Input
                              placeholder="Search accounts..."
                              value={debitSearch}
                              onChange={(e) => setDebitSearch(e.target.value)}
                              onKeyDown={(e) => e.stopPropagation()}
                              className="h-8 mb-1"
                            />
                          </div>
                          {filteredDebitAccounts.length === 0 && (
                            <p className="text-sm text-muted-foreground p-2">No accounts found</p>
                          )}
                          {filteredDebitAccounts
                            .filter((acc) => String(acc._id) !== selectedCredit)
                            .map((acc) => (
                              <SelectItem key={String(acc._id)} value={String(acc._id)}>
                                {(acc.code ?? "-")} - {acc.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                    {!isDebitValid && selectedDebit && (
                      <p className="text-xs text-destructive mt-1">Debit must be an active asset account.</p>
                    )}
                    {selectedDebit && selectedCredit && selectedDebit === selectedCredit && (
                      <p className="text-xs text-destructive mt-1">Debit and credit cannot be the same.</p>
                    )}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="creditAccount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Installment Credit Account</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!isAdmin || accountsLoading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select credit account" />
                        </SelectTrigger>
                        <SelectContent>
                          <div className="p-1">
                            <Input
                              placeholder="Search accounts..."
                              value={creditSearch}
                              onChange={(e) => setCreditSearch(e.target.value)}
                              onKeyDown={(e) => e.stopPropagation()}
                              className="h-8 mb-1"
                            />
                          </div>
                          {filteredCreditAccounts.length === 0 && (
                            <p className="text-sm text-muted-foreground p-2">No accounts found</p>
                          )}
                          {filteredCreditAccounts
                            .filter((acc) => String(acc._id) !== selectedDebit)
                            .map((acc) => (
                              <SelectItem key={String(acc._id)} value={String(acc._id)}>
                                {(acc.code ?? "-")} - {acc.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                    {!isCreditValid && selectedCredit && (
                      <p className="text-xs text-destructive mt-1">
                        Credit must be an active liability/equity account.
                      </p>
                    )}
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={!canSave}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
