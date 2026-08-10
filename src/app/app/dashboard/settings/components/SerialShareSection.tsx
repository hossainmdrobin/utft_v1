"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Hash, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const serialShareSchema = z.object({
  next_member_serial: z.coerce.number().min(1),
  share_value: z.coerce.number().min(0),
});

type SerialShareValues = z.infer<typeof serialShareSchema>;

interface SerialShareSectionProps {
  settings: any;
  onUpdate: (value: any) => void;
  isAdmin: boolean;
  isSaving: boolean;
}

export function SerialShareSection({ settings, onUpdate, isAdmin, isSaving }: SerialShareSectionProps) {
  const form = useForm<SerialShareValues>({
    resolver: zodResolver(serialShareSchema),
    defaultValues: {
      next_member_serial: 1,
      share_value: 0,
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        next_member_serial: settings.next_member_serial ?? 1,
        share_value: settings.share_value ?? 0,
      });
    }
  }, [settings, form]);

  const previewSerial = form.watch("next_member_serial");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hash className="h-5 w-5" />
          Member Serial & Share Value
        </CardTitle>
        <CardDescription>
          Configure member serial numbering and per-share value
        </CardDescription>
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
                name="next_member_serial"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next Member Serial</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} disabled={!isAdmin} />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Next member will be assigned serial #{String(previewSerial || 1).padStart(3, "0")}
                    </p>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="share_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Share Value (৳)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} disabled={!isAdmin} />
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
