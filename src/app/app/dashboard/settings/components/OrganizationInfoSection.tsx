"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const orgInfoSchema = z.object({
  organization_name: z.string().min(1, "Organization name is required"),
  organization_address: z.string().optional(),
  organization_phone: z.string().optional(),
  organization_email: z.string().optional(),
  logo_url: z.string().optional(),
});

type OrgInfoValues = z.infer<typeof orgInfoSchema>;

interface OrganizationInfoSectionProps {
  settings: any;
  onUpdate: (value: any) => void;
  isAdmin: boolean;
  isSaving: boolean;
}

export function OrganizationInfoSection({ settings, onUpdate, isAdmin, isSaving }: OrganizationInfoSectionProps) {
  const form = useForm<OrgInfoValues>({
    resolver: zodResolver(orgInfoSchema),
    defaultValues: {
      organization_name: "",
      organization_address: "",
      organization_phone: "",
      organization_email: "",
      logo_url: "",
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        organization_name: settings.organization_name || "",
        organization_address: settings.organization_address || "",
        organization_phone: settings.organization_phone || "",
        organization_email: settings.organization_email || "",
        logo_url: settings.logo_url || "",
      });
    }
  }, [settings, form]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Organization Information
        </CardTitle>
        <CardDescription>Basic details about your organization for reports and documents</CardDescription>
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
                name="organization_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Organization" {...field} disabled={!isAdmin} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="organization_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="info@example.com" {...field} disabled={!isAdmin} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="organization_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="+880 1XXX-XXXXXX" {...field} disabled={!isAdmin} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="organization_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Full address..." {...field} disabled={!isAdmin} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="logo_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Logo URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} disabled={!isAdmin} />
                  </FormControl>
                  <FormDescription>URL to your organization's logo for reports</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
