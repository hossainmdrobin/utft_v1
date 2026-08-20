"use client";

import { FormEvent, useEffect, useState } from "react";
import { CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { useGetCurrentUserQuery } from "@/store/slices/authSlice/api.auth";
import { useCreateAamarPayPaymentMutation } from "@/store/slices/paymentSlice/api.slice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type PaymentForm = {
    amount: string;
    description: string;
    name: string;
    email: string;
    phone: string;
};

  function getPaymentErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message;

    const apiError = error as { data?: { error?: string } };
    return apiError?.data?.error || "Please try again.";
  }

export default function Payments() {
    const { toast } = useToast();
    const { data: currentUserData, isLoading: isUserLoading } = useGetCurrentUserQuery();
    const [createPayment, {data, isLoading: isPaymentLoading }] = useCreateAamarPayPaymentMutation();
    console.log("consoling payament data",data);
    const [form, setForm] = useState<PaymentForm>({
      amount: "500",
      description: "Membership payment",
      name: "Robin",
      email: "hossaim@gmail.com",
      phone: "56456u745",
    });

    useEffect(() => {
      const member = currentUserData?.data;
      if (!member) return;
      setForm((previous) => ({
        ...previous,
        name: previous.name || member.full_name || "",
        email: previous.email || member.email || "",
        phone: previous.phone || member.mobile || "",
      }));
    }, [currentUserData]);

    useEffect(() => {
      const status = new URLSearchParams(window.location.search).get("status");
      if (!status) return;
      const messages: Record<string, { title: string; description: string; variant?: "destructive" }> = {
        success: { title: "Payment submitted", description: "AamarPay reported a successful payment." },
        fail: { title: "Payment failed", description: "AamarPay could not complete the payment.", variant: "destructive" },
        cancel: { title: "Payment cancelled", description: "The payment was cancelled before completion.", variant: "destructive" },
      };
      const message = messages[status];
      if (message) toast(message);
    }, [toast]);

    const updateField = (field: keyof PaymentForm, value: string) => {
      setForm((previous) => ({ ...previous, [field]: value }));
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      try {
        const result = await createPayment(form).unwrap();
        window.location.assign(result.paymentUrl);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Payment could not start",
          description: getPaymentErrorMessage(error),
        });
      }
    };

    return (
      <div className="mx-auto max-w-3xl space-y-6 py-4">
        <div>
          <h2 className="text-3xl font-bold">Make a payment</h2>
          <p className="mt-1 text-muted-foreground">Pay your trust account securely through AamarPay.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" /> Payment details</CardTitle>
            <CardDescription>Enter the amount and contact details used for your payment receipt.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <label className="space-y-2 text-sm font-medium">
                  Amount (BDT)
                  <Input required min="1" step="0.01" type="number" value={200} onChange={(event) => updateField("amount", event.target.value)} placeholder="0.00" />
                </label>
                <label className="space-y-2 text-sm font-medium">
                  Payment purpose
                  <Input required value={form.description} onChange={(event) => updateField("description", event.target.value)} placeholder="Membership payment" />
                </label>
                <label className="space-y-2 text-sm font-medium">
                  Full name
                  <Input required value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Your full name" />
                </label>
                <label className="space-y-2 text-sm font-medium">
                  Email address
                  <Input required type="email" value="hossainmdrobin9@gmail.com" onChange={(event) => updateField("email", event.target.value)} placeholder="you@example.com" />
                </label>
                <label className="space-y-2 text-sm font-medium md:col-span-2">
                  Mobile number
                  <Input required type="tel" value='01772784031' onChange={(event) => updateField("phone", event.target.value)} placeholder="01XXXXXXXXX" />
                </label>
              </div>
              <div className="flex flex-col gap-4 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4 text-accent" /> You will be redirected to AamarPay to complete payment.</p>
                <Button type="submit" disabled={isPaymentLoading || isUserLoading} className="sm:min-w-44">
                  {isPaymentLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Continue to AamarPay
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }
