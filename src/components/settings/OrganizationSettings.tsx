import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAdmin } from "@/hooks/use-admin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Calendar, Coins, Save } from "lucide-react";

const orgInfoSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  logo_url: z.string().optional(),
});

const fiscalYearSchema = z.object({
  start_month: z.coerce.number().min(1).max(12),
  start_day: z.coerce.number().min(1).max(31),
});

const currencySchema = z.object({
  symbol: z.string().min(1, "Currency symbol is required"),
  code: z.string().min(2).max(5),
  decimal_places: z.coerce.number().min(0).max(4),
  position: z.enum(["before", "after"]),
});

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

type SettingValue = {
  organization_info?: z.infer<typeof orgInfoSchema>;
  fiscal_year?: z.infer<typeof fiscalYearSchema>;
  currency?: z.infer<typeof currencySchema>;
};

export function OrganizationSettings() {
  const { isAdmin } = useAdmin();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["organization-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_settings")
        .select("*");
      if (error) throw error;
      
      const settingsMap: Record<string, any> = {};
      data.forEach((s) => {
        settingsMap[s.key] = s.value;
      });
      return settingsMap as SettingValue;
    },
  });

  const orgForm = useForm<z.infer<typeof orgInfoSchema>>({
    resolver: zodResolver(orgInfoSchema),
    defaultValues: {
      name: "",
      address: "",
      phone: "",
      email: "",
      logo_url: "",
    },
  });

  const fiscalForm = useForm<z.infer<typeof fiscalYearSchema>>({
    resolver: zodResolver(fiscalYearSchema),
    defaultValues: {
      start_month: 1,
      start_day: 1,
    },
  });

  const currencyForm = useForm<z.infer<typeof currencySchema>>({
    resolver: zodResolver(currencySchema),
    defaultValues: {
      symbol: "৳",
      code: "BDT",
      decimal_places: 2,
      position: "before",
    },
  });

  useEffect(() => {
    if (settings?.organization_info) {
      orgForm.reset(settings.organization_info as z.infer<typeof orgInfoSchema>);
    }
    if (settings?.fiscal_year) {
      fiscalForm.reset(settings.fiscal_year as z.infer<typeof fiscalYearSchema>);
    }
    if (settings?.currency) {
      currencyForm.reset(settings.currency as z.infer<typeof currencySchema>);
    }
  }, [settings, orgForm, fiscalForm, currencyForm]);

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("organization_settings")
        .update({
          value,
          updated_at: new Date().toISOString(),
          updated_by: user.user?.id,
        })
        .eq("key", key);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-settings"] });
      toast.success("Settings saved successfully");
    },
    onError: () => {
      toast.error("Failed to save settings");
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Organization Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organization Information
          </CardTitle>
          <CardDescription>
            Basic details about your organization for reports and documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...orgForm}>
            <form
              onSubmit={orgForm.handleSubmit((v) => updateSetting.mutate({ key: "organization_info", value: v }))}
              className="space-y-4"
            >
              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={orgForm.control}
                  name="name"
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
                  control={orgForm.control}
                  name="email"
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
                control={orgForm.control}
                name="phone"
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
                control={orgForm.control}
                name="address"
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
                control={orgForm.control}
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
                  <Button type="submit" disabled={updateSetting.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Fiscal Year */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Fiscal Year Configuration
          </CardTitle>
          <CardDescription>
            Set when your financial year starts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...fiscalForm}>
            <form
              onSubmit={fiscalForm.handleSubmit((v) => updateSetting.mutate({ key: "fiscal_year", value: v }))}
              className="space-y-4"
            >
              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={fiscalForm.control}
                  name="start_month"
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
                  control={fiscalForm.control}
                  name="start_day"
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
                  <Button type="submit" disabled={updateSetting.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Currency Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Currency Settings
          </CardTitle>
          <CardDescription>
            Configure how currency values are displayed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...currencyForm}>
            <form
              onSubmit={currencyForm.handleSubmit((v) => updateSetting.mutate({ key: "currency", value: v }))}
              className="space-y-4"
            >
              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={currencyForm.control}
                  name="symbol"
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
                  control={currencyForm.control}
                  name="code"
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
                  control={currencyForm.control}
                  name="decimal_places"
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
                  control={currencyForm.control}
                  name="position"
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
                  <Button type="submit" disabled={updateSetting.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
