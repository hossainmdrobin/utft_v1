import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { useCreateJournalEntryMutation } from "@/store/slices/journalEntrySlice/api.journalEntry";
import { useGetAccountsQuery } from "@/store/slices/accountSlice/api.account";
import { useGetMembersQuery } from "@/store/slices/memberSlice/api.member";
import { MemberFilterWithKeyTypeRole, memberFilterWithKeyTypeRoleType } from "@/app/app/dashboard/accounting/filters";

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
  const [filter, setFilter] = useState<memberFilterWithKeyTypeRoleType>({})
  const [createJournalEntry, { data: entryData, isLoading: entryLoading, error: entryError }] = useCreateJournalEntryMutation()
  const { data: accounts, isLoading: accountLoading } = useGetAccountsQuery()
  const { data: members, isLoading: memberLoading } = useGetMembersQuery(filter)
  const [accountSearch, setAccountSearch] = useState<Record<number, string>>({})

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

  const lines = form.watch("lines");
  const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  useEffect(() => {
    if (entryData) {
      toast.success("Journal entry created successfully");
      form.reset();
      setOpen(false);
    }
    if (entryError) toast.error(entryError?.message || "Failed to create journal entry");
  }, [entryData, entryError])

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
            onSubmit={form.handleSubmit((v) => createJournalEntry(v))}
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
                        <MemberFilterWithKeyTypeRole filter={filter} setFilter={setFilter} />
                        {/* <SelectItem value="none">No Member</SelectItem> */}
                        {members?.data?.map((m) => (
                          <SelectItem key={m._id} value={m._id}>
                            {m.user_id} - {m.full_name}
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
                             render={({ field }) => {
                               const search = accountSearch[index] || ""
                               const selectedAccountIds = lines
                                 .map((l) => l.account_id)
                                 .filter((id): id is string => Boolean(id) && id !== field.value)
                               const filteredAccounts = accounts?.data?.filter((acc) => {
                                 const matchesSearch =
                                   !search ||
                                   acc.code.toLowerCase().includes(search.toLowerCase()) ||
                                   acc.name.toLowerCase().includes(search.toLowerCase())
                                 return matchesSearch && !selectedAccountIds.includes(acc._id)
                               }) || []
                               return (
                                 <Select
                                   onValueChange={field.onChange}
                                   value={field.value}
                                 >
                                   <SelectTrigger className="h-8">
                                     <SelectValue placeholder="Select account" />
                                   </SelectTrigger>
                                   <SelectContent>
                                     <div className="p-1">
                                       <Input
                                         placeholder="Search accounts..."
                                         value={search}
                                         onChange={(e) =>
                                           setAccountSearch((prev) => ({
                                             ...prev,
                                             [index]: e.target.value,
                                           }))
                                         }
                                         onKeyDown={(e) => e.stopPropagation()}
                                         className="h-8 mb-1"
                                       />
                                     </div>
                                     {filteredAccounts.length === 0 && (
                                       <p className="text-sm text-muted-foreground p-2">
                                         No accounts found
                                       </p>
                                     )}
                                     {filteredAccounts.map((acc) => (
                                       <SelectItem key={acc._id} value={acc._id}>
                                         {acc.code} - {acc.name}
                                       </SelectItem>
                                     ))}
                                   </SelectContent>
                                 </Select>
                               )
                             }}
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
                disabled={entryLoading || !isBalanced}
              >
                {entryLoading ? "Creating..." : "Create Entry"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
