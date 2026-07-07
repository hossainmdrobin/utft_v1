import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
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
import { Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";

const journalLineSchema = z.object({
  account_id: z.string().min(1, "Account required"),
  description: z.string().optional(),
  debit: z.coerce.number().min(0).default(0),
  credit: z.coerce.number().min(0).default(0),
});

const journalEntrySchema = z.object({
  entry_date: z.string().min(1, "Date required"),
  reference: z.string().optional(),
  description: z.string().optional(),
  member_id: z.string().optional(),
  lines: z.array(journalLineSchema).min(2, "At least 2 lines required"),
});

type JournalEntryFormValues = z.infer<typeof journalEntrySchema>;

interface JournalEntryDialogProps {
  trigger?: React.ReactNode;
}

export function JournalEntryDialog({ trigger }: JournalEntryDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<JournalEntryFormValues>({
    resolver: zodResolver(journalEntrySchema),
    defaultValues: {
      entry_date: format(new Date(), "yyyy-MM-dd"),
      reference: "",
      description: "",
      member_id: "",
      lines: [
        { account_id: "", description: "", debit: 0, credit: 0 },
        { account_id: "", description: "", debit: 0, credit: 0 },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  const { data: accounts } = useQuery({
    queryKey: ["accounts-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("id, code, name, account_type")
        .eq("is_active", true)
        .eq("is_system", false)
        .order("code");
      if (error) throw error;
      return data;
    },
  });

  const { data: members } = useQuery({
    queryKey: ["members-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name, beneficiary_id")
        .eq("status", "active")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const createEntry = useMutation({
    mutationFn: async (values: JournalEntryFormValues) => {
      const { data: user } = await supabase.auth.getUser();
      
      // Generate entry number
      const { data: entryNumber } = await supabase.rpc("generate_entry_number");
      
      const totalDebit = values.lines.reduce((sum, l) => sum + (l.debit || 0), 0);
      const totalCredit = values.lines.reduce((sum, l) => sum + (l.credit || 0), 0);

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error("Debits must equal credits");
      }

      // Create journal entry
      const { data: entry, error: entryError } = await supabase
        .from("journal_entries")
        .insert({
          entry_number: entryNumber,
          entry_date: values.entry_date,
          reference: values.reference || null,
          description: values.description || null,
          member_id: values.member_id || null,
          total_debit: totalDebit,
          total_credit: totalCredit,
          created_by: user.user?.id,
        })
        .select()
        .single();

      if (entryError) throw entryError;

      // Create journal entry lines
      const lines = values.lines
        .filter((l) => l.debit > 0 || l.credit > 0)
        .map((l) => ({
          journal_entry_id: entry.id,
          account_id: l.account_id,
          description: l.description || null,
          debit: l.debit || 0,
          credit: l.credit || 0,
        }));

      const { error: linesError } = await supabase
        .from("journal_entry_lines")
        .insert(lines);

      if (linesError) throw linesError;

      return entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      toast.success("Journal entry created successfully");
      form.reset();
      setOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create journal entry");
    },
  });

  const lines = form.watch("lines");
  const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Transaction
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Journal Entry</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => createEntry.mutate(v))}
            className="space-y-4"
          >
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="entry_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference</FormLabel>
                    <FormControl>
                      <Input placeholder="Ref #" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="member_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Member</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === "none" ? "" : value)} 
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No Member</SelectItem>
                        {members?.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.beneficiary_id} - {m.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Entry description..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <FormLabel>Journal Lines</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({ account_id: "", description: "", debit: 0, credit: 0 })
                  }
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Line
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-2">Account</th>
                      <th className="text-left p-2">Description</th>
                      <th className="text-right p-2 w-28">Debit</th>
                      <th className="text-right p-2 w-28">Credit</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field, index) => (
                      <tr key={field.id} className="border-t">
                        <td className="p-2">
                          <FormField
                            control={form.control}
                            name={`lines.${index}.account_id`}
                            render={({ field }) => (
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Select account" />
                                </SelectTrigger>
                                <SelectContent>
                                  {accounts?.map((acc) => (
                                    <SelectItem key={acc.id} value={acc.id}>
                                      {acc.code} - {acc.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </td>
                        <td className="p-2">
                          <FormField
                            control={form.control}
                            name={`lines.${index}.description`}
                            render={({ field }) => (
                              <Input
                                className="h-8"
                                placeholder="Line description"
                                {...field}
                              />
                            )}
                          />
                        </td>
                        <td className="p-2">
                          <FormField
                            control={form.control}
                            name={`lines.${index}.debit`}
                            render={({ field }) => (
                              <Input
                                className="h-8 text-right"
                                type="number"
                                step="0.01"
                                min="0"
                                {...field}
                              />
                            )}
                          />
                        </td>
                        <td className="p-2">
                          <FormField
                            control={form.control}
                            name={`lines.${index}.credit`}
                            render={({ field }) => (
                              <Input
                                className="h-8 text-right"
                                type="number"
                                step="0.01"
                                min="0"
                                {...field}
                              />
                            )}
                          />
                        </td>
                        <td className="p-2">
                          {fields.length > 2 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => remove(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted font-medium">
                    <tr>
                      <td colSpan={2} className="p-2 text-right">
                        Totals:
                      </td>
                      <td className="p-2 text-right">৳{totalDebit.toFixed(2)}</td>
                      <td className="p-2 text-right">৳{totalCredit.toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {!isBalanced && totalDebit > 0 && (
                <p className="text-destructive text-sm">
                  Entry is not balanced. Difference: ৳
                  {Math.abs(totalDebit - totalCredit).toFixed(2)}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createEntry.isPending || !isBalanced}
              >
                {createEntry.isPending ? "Creating..." : "Create Entry"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
