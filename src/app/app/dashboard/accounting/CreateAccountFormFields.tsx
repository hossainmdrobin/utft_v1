import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetAccountsQuery } from "@/store/slices/accountSlice/api.account";
import { AccountDoc } from "@/models/Account";

export const accountSchema = z.object({
  code: z.string().min(1, "Code is required").max(20, "Code too long").optional().or(z.literal("")),
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  type: z.enum(["asset", "liability", "equity", "income", "expense"]),
  parentAccount: z.string().optional(),
  description: z.string().optional(),
});

export type AccountFormValues = z.infer<typeof accountSchema>;

interface CreateAccountFormFieldsProps {
  form: ReturnType<typeof useForm<AccountFormValues>>;
}

export function CreateAccountFormFields({
  form,
}: CreateAccountFormFieldsProps) {
  const { data: accountsData } = useGetAccountsQuery();
  const accounts: AccountDoc[] = accountsData?.data ?? [];

  return (
    <Form {...form}>
      <>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account Code *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 1103" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account Type *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="asset">Asset</SelectItem>
                    <SelectItem value="liability">Liability</SelectItem>
                    <SelectItem value="equity">Equity</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                  <FormMessage />
                </Select>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account Name *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Petty Cash" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="parentAccount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Parent Account (optional)</FormLabel>
              <FormControl>
                <Select
                  onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                  value={field.value || "none"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None (top-level)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (top-level)</SelectItem>
                    {accounts.map((acc) => (
                      <SelectItem key={String(acc._id)} value={String(acc._id)}>
                        {acc.code || "-"} — {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Account description..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </>
    </Form>
  );
}
