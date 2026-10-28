import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface Account {
  _id: string;
  code?: string;
  name: string;
}

interface AccountSelectProps {
  field: {
    value?: string;
    onChange: (value: string) => void;
    name?: string;
    ref?: (el: HTMLInputElement | null) => void;
    onBlur?: () => void;
  };
  index: number;
  accountSearch: Record<number, string>;
  setAccountSearch: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  accounts?: Account[];
  lines: { account?: string }[];
}

export function AccountSelect({
  field,
  index,
  accountSearch,
  setAccountSearch,
  accounts,
  lines,
}: AccountSelectProps) {
  const search = accountSearch[index] || "";
  const selectedAccountIds = lines
    .map((l) => l.account)
    .filter((id): id is string => Boolean(id) && id !== field.value);
  const filteredAccounts = accounts?.filter((acc) => {
    const matchesSearch =
      !search ||
      (acc.code || "").toLowerCase().includes(search.toLowerCase()) ||
      acc.name.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && !selectedAccountIds.includes(acc._id);
  }) || [];

  return (
    <Select onValueChange={field.onChange} value={field.value}>
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
          <p className="text-sm text-muted-foreground p-2">No accounts found</p>
        )}
        {filteredAccounts.map((acc) => (
          <SelectItem key={acc._id} value={acc._id}>
            {(acc.code || "")} - {acc.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
