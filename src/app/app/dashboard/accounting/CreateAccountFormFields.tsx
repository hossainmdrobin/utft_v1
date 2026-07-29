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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const accountSchema = z.object({
  code: z.string().min(1, "Code is required").max(20, "Code too long"),
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  account_type: z.enum(["asset", "liability", "equity", "income", "expense"]),
  parent_id: z.string().optional(),
  parent_account_id: z.string().optional(),
  description: z.string().optional(),
  opening_balance: z.coerce.number().default(0),
  is_contra: z.boolean().default(false),
}).refine(
  (data) => !data.is_contra || (data.is_contra && data.parent_account_id && data.parent_account_id !== "none"),
  {
    message: "Contra accounts must be linked to a main account",
    path: ["parent_account_id"],
  }
);

export type AccountFormValues = z.infer<typeof accountSchema>;

interface CreateAccountFormFieldsProps {
  form: ReturnType<typeof useForm<AccountFormValues>>;
  // parentAccounts: any[] | undefined;
  mainAccounts: any[] | undefined;
  filteredParents: any[] | undefined;
  filteredMainAccounts: any[] | undefined;
}

export function CreateAccountFormFields({
  form,
  // parentAccounts,
  filteredParents,
  filteredMainAccounts,
}: CreateAccountFormFieldsProps) {
  const isContra = form.watch("is_contra");
  const selectedType = form.watch("account_type");

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
            name="account_type"
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
                </Select>
                <FormMessage />
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
          name="parent_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Parent Account</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                value={field.value || "none"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent (optional)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">No Parent (Top Level)</SelectItem>
                  {filteredParents?.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.code} - {acc.name}
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
          name="is_contra"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked);
                    if (!checked) {
                      form.setValue("parent_account_id", "");
                    }
                  }}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Contra Account</FormLabel>
                <FormDescription>
                  Contra accounts have opposite normal balances (e.g., Accumulated Depreciation is a contra-asset with credit balance)
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        {isContra && (
          <FormField
            control={form.control}
            name="parent_account_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Linked Main Account *</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                  value={field.value || "none"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select main account to offset" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Select main account...</SelectItem>
                    {filteredMainAccounts?.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  This account&apos;s balance will be netted against the selected main account in Balance Sheet
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="opening_balance"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Opening Balance</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" {...field} />
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
                <Textarea
                  placeholder="Account description..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </>
    </Form>
  );
}
