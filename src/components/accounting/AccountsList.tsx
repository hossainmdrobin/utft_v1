import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, ChevronRight, ChevronDown, Folder, FolderOpen, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

type Account = {
  id: string;
  code: string;
  name: string;
  account_type: string;
  parent_id: string | null;
  description: string | null;
  is_active: boolean;
  is_system: boolean;
  is_contra: boolean;
  opening_balance: number;
  current_balance: number;
};

type AccountWithChildren = Account & { children: AccountWithChildren[] };

const typeColors: Record<string, string> = {
  asset: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  liability: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  equity: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  income: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  expense: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

const typeOrder = ["asset", "liability", "equity", "income", "expense"];
const typeLabels: Record<string, string> = {
  asset: "Assets",
  liability: "Liabilities",
  equity: "Equity",
  income: "Income",
  expense: "Expenses",
};

export function AccountsList() {
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(
    new Set(typeOrder)
  );
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .order("code");
      if (error) throw error;
      return data as Account[];
    },
  });

  const toggleAccount = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("accounts")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Account updated");
    },
    onError: () => {
      toast.error("Failed to update account");
    },
  });

  const toggleType = (type: string) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const toggleAccountExpand = (id: string) => {
    setExpandedAccounts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  // Group accounts by type
  const groupedAccounts = accounts?.reduce((acc, account) => {
    if (!acc[account.account_type]) {
      acc[account.account_type] = [];
    }
    acc[account.account_type].push(account);
    return acc;
  }, {} as Record<string, Account[]>);

  // Build tree structure with unlimited depth
  const buildTree = (accountsList: Account[]): AccountWithChildren[] => {
    const map = new Map<string, AccountWithChildren>();
    const roots: AccountWithChildren[] = [];

    // First pass: create nodes
    accountsList.forEach((acc) => {
      map.set(acc.id, { ...acc, children: [] });
    });

    // Second pass: build tree
    accountsList.forEach((acc) => {
      const node = map.get(acc.id)!;
      if (acc.parent_id && map.has(acc.parent_id)) {
        map.get(acc.parent_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    // Sort children by code
    const sortChildren = (nodes: AccountWithChildren[]) => {
      nodes.sort((a, b) => a.code.localeCompare(b.code));
      nodes.forEach((node) => sortChildren(node.children));
    };
    sortChildren(roots);

    return roots;
  };

  const getAccountLevel = (account: AccountWithChildren): number => {
    // Check if this account has children (is a category/folder)
    return account.children.length > 0 ? 0 : 1; // 0 = folder, 1 = leaf
  };

  const renderAccountRow = (account: AccountWithChildren, depth: number): JSX.Element[] => {
    const rows: JSX.Element[] = [];
    const hasChildren = account.children.length > 0;
    const isExpanded = expandedAccounts.has(account.id);
    const indentPx = depth * 24 + 16;

    rows.push(
      <TableRow 
        key={account.id} 
        className={cn(
          !account.is_active && "opacity-50",
          hasChildren && "bg-muted/30 hover:bg-muted/50",
          !hasChildren && "hover:bg-muted/20"
        )}
      >
        <TableCell 
          className="font-mono cursor-pointer" 
          style={{ paddingLeft: `${indentPx}px` }}
          onClick={() => hasChildren && toggleAccountExpand(account.id)}
        >
          <div className="flex items-center gap-2">
            {hasChildren ? (
              <>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                {isExpanded ? (
                  <FolderOpen className="h-4 w-4 text-amber-500" />
                ) : (
                  <Folder className="h-4 w-4 text-amber-500" />
                )}
              </>
            ) : (
              <>
                <span className="w-4" />
                <FileText className="h-4 w-4 text-muted-foreground" />
              </>
            )}
            <span>{account.code}</span>
          </div>
        </TableCell>
        <TableCell 
          className={cn("cursor-pointer", hasChildren && "font-semibold")}
          onClick={() => hasChildren && toggleAccountExpand(account.id)}
        >
          {account.name}
        </TableCell>
        <TableCell>
          {!hasChildren && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={typeColors[account.account_type]}>
                {account.account_type}
              </Badge>
              {account.is_contra && (
                <Badge variant="secondary" className="text-xs">
                  Contra
                </Badge>
              )}
            </div>
          )}
        </TableCell>
        <TableCell className="text-right font-mono">
          {!hasChildren && (
            <>৳{Number(account.current_balance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</>
          )}
        </TableCell>
        <TableCell>
          {account.is_system ? (
            <Badge variant="secondary">System</Badge>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    toggleAccount.mutate({ id: account.id, is_active: !account.is_active })
                  }
                >
                  {account.is_active ? "Deactivate" : "Activate"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </TableCell>
      </TableRow>
    );

    // Render children if expanded
    if (hasChildren && isExpanded) {
      account.children.forEach((child) => {
        rows.push(...renderAccountRow(child, depth + 1));
      });
    }

    return rows;
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-48">Code</TableHead>
            <TableHead>Account Name</TableHead>
            <TableHead className="w-32">Type</TableHead>
            <TableHead className="text-right w-40">Balance</TableHead>
            <TableHead className="w-20">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {typeOrder.map((type) => {
            const typeAccounts = groupedAccounts?.[type] || [];
            if (typeAccounts.length === 0) return null;

            const tree = buildTree(typeAccounts);
            const isExpanded = expandedTypes.has(type);

            // Calculate total balance for type
            const totalBalance = typeAccounts.reduce(
              (sum, acc) => sum + Number(acc.current_balance),
              0
            );

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
                {isExpanded && tree.map((acc) => renderAccountRow(acc, 0))}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
