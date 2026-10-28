import { UseFieldArrayReturn } from "react-hook-form";
import { UseFormReturn } from "react-hook-form";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormMessage, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { JournalEntryFormValues } from "./types";
import { AccountSelect } from "./AccountSelect";

interface Account {
  _id: string;
  code: string;
  name: string;
}

interface JournalLinesProps {
  form: UseFormReturn<JournalEntryFormValues>;
  fields: UseFieldArrayReturn<JournalEntryFormValues, "lines", "id">["fields"];
  append: UseFieldArrayReturn<JournalEntryFormValues, "lines", "id">["append"];
  remove: UseFieldArrayReturn<JournalEntryFormValues, "lines", "id">["remove"];
  lines: JournalEntryFormValues["lines"];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  accountSearch: Record<number, string>;
  setAccountSearch: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  accounts?: Account[];
}

export function JournalLines({
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
}: JournalLinesProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <FormLabel>Journal Lines</FormLabel>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            append({ account: "", description: "", debit: 0, credit: 0 })
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
                    name={`lines.${index}.account`}
                    render={({ field }) => (
                      <AccountSelect
                        field={field}
                        index={index}
                        accountSearch={accountSearch}
                        setAccountSearch={setAccountSearch}
                        accounts={accounts}
                        lines={lines}
                      />
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
  );
}