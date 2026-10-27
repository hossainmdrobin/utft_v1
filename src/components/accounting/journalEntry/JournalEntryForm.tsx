import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormControl,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JournalEntryFormValues } from "./types";
import { JournalLines } from "./JournalLines";
import { MemberFilterWithKeyTypeRole } from "@/app/app/dashboard/accounting/filters";

interface Account {
  _id: string;
  code: string;
  name: string;
}

interface Member {
  _id: string;
  user_id: string;
  full_name?: string;
}

interface JournalEntryFormProps {
  form: any;
  fields: any[];
  append: (value: any) => void;
  remove: (index: number) => void;
  lines: any[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  accountSearch: Record<number, string>;
  setAccountSearch: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  accounts?: Account[];
  members?: Member[];
  filter: any;
  setFilter: React.Dispatch<React.SetStateAction<any>>;
  onSubmit: (values: JournalEntryFormValues) => void;
  entryLoading: boolean;
}

export function JournalEntryForm({
  form,
  fields,
  append,
  remove,
  lines,
  totalDebit,
  totalCredit,
  isBalanced,
  accountSearch,
  setAccountSearch,
  accounts,
  members,
  filter,
  setFilter,
  onSubmit,
  entryLoading,
}: JournalEntryFormProps) {
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((v: JournalEntryFormValues) => onSubmit(v))}
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
                    {members?.map((m) => (
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

        <JournalLines
          form={form}
          fields={fields}
          append={append}
          remove={remove}
          lines={lines}
          totalDebit={totalDebit}
          totalCredit={totalCredit}
          isBalanced={isBalanced}
          accountSearch={accountSearch}
          setAccountSearch={setAccountSearch}
          accounts={accounts}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset()}
          >
            Reset
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
  );
}