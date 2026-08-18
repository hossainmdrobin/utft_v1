import React from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronDown } from "lucide-react";
import { Account, AccountDoc } from "@/models/Account";
import { typeLabels } from "./AccountsList";
import AccountRow from "./AccountRow";


interface AccountTypeRowProps {
  type: string;
  typeAccounts: AccountDoc[];
  isExpanded: boolean;
  totalBalance: number;
  toggleType: (type: string) => void;
  tree: AccountDoc[];
  renderAccountRow: (account: AccountDoc, depth: number) => React.ReactElement[];
}

export function AccountTypeRow({
  type,
  typeAccounts,
  isExpanded,
  totalBalance,
  toggleType,
  tree,
}: AccountTypeRowProps) {
  return (
    <React.Fragment key={type}>
      <TableRow
        className="bg-primary/10 cursor-pointer hover:bg-primary/20"
        onClick={() => toggleType(type)}
      >
        <TableCell colSpan={3} className="font-bold">
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
            <span className="text-base">{typeLabels[type]}</span>
            <Badge variant="secondary" className="ml-2">
              {typeAccounts.length} 
            </Badge>
          </div>
        </TableCell>
        <TableCell className="text-right font-bold font-mono">
          ৳{totalBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </TableCell>
        <TableCell />
      </TableRow>
      {isExpanded && tree.map((acc) => 
      <AccountRow account={acc} />
      )}
    </React.Fragment>
  );
}
