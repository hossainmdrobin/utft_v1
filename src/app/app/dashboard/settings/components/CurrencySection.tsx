"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Coins, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const currencySchema = z.object({
  currency_symbol: z.string().min(1, "Currency symbol is required"),
  currency_code: z.string().min(2).max(5),
  currency_decimal_places: z.coerce.number().min(0).max(4),
  currency_position: z.enum(["before", "after"]),
});

type CurrencyValues = z.infer<typeof currencySchema>;

interface CurrencySectionProps {
  settings: any;
  onUpdate: (value: any) => void;
  isAdmin: boolean;
  isSaving: boolean;
}

export function CurrencySection({ settings, onUpdate, isAdmin, isSaving }: CurrencySectionProps) {
  const form = useForm<CurrencyValues>({
    resolver: zodResolver(currencySchema),
    defaultValues: {
      currency_symbol: "৳",
      currency_code: "BDT",
      currency_decimal_places: 2,
      currency_position: "before",
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        currency_symbol: settings.currency_symbol || "৳",
        currency_code: settings.currency_code || "BDT",
        currency_decimal_places: settings.currency_decimal_places ?? 2,
        currency_position: settings.currency_position || "before",
      });
    }
  }, [settings, form]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5" />
          Currency Settings
        </CardTitle>
        <CardDescription>Configure how currency values are displayed</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => onUpdate(v))}
            className="space-y-4"
          >
            <div className="grid md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="currency_symbol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency Symbol</FormLabel>
                    <FormControl>
                      <Input placeholder="৳" {...field} disabled={!isAdmin} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency Code</FormLabel>
                    <FormControl>
                      <Input placeholder="BDT" {...field} disabled={!isAdmin} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="currency_decimal_places"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Decimal Places</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} max={4} {...field} disabled={!isAdmin} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency_position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Symbol Position</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!isAdmin}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select position" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="before">Before amount (৳100)</SelectItem>
                        <SelectItem value="after">After amount (100৳)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {isAdmin && (
              <div className="flex justify-end">
                <Button type="submit" disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
