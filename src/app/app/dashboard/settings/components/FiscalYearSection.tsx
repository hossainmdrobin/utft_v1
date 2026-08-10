"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Calendar, Save } from "lucide-react";
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

const fiscalYearSchema = z.object({
  fiscal_year_start_month: z.coerce.number().min(1).max(12),
  fiscal_year_start_day: z.coerce.number().min(1).max(31),
});

type FiscalYearValues = z.infer<typeof fiscalYearSchema>;

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

interface FiscalYearSectionProps {
  settings: any;
  onUpdate: (value: any) => void;
  isAdmin: boolean;
  isSaving: boolean;
}

export function FiscalYearSection({ settings, onUpdate, isAdmin, isSaving }: FiscalYearSectionProps) {
  const form = useForm<FiscalYearValues>({
    resolver: zodResolver(fiscalYearSchema),
    defaultValues: {
      fiscal_year_start_month: 1,
      fiscal_year_start_day: 1,
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        fiscal_year_start_month: settings.fiscal_year_start_month || 1,
        fiscal_year_start_day: settings.fiscal_year_start_day || 1,
      });
    }
  }, [settings, form]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Fiscal Year Configuration
        </CardTitle>
        <CardDescription>Set when your financial year starts</CardDescription>
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
                name="fiscal_year_start_month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Month</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(parseInt(v))}
                      value={String(field.value)}
                      disabled={!isAdmin}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select month" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {months.map((m, i) => (
                          <SelectItem key={i} value={String(i + 1)}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fiscal_year_start_day"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Day</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={31}
                        {...field}
                        disabled={!isAdmin}
                      />
                    </FormControl>
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
