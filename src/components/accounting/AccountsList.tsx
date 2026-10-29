"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { MoreVertical, Edit, ChevronRight, ChevronDown, Trash2, Folder, FolderOpen, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { AccountDoc } from "@/models/Account";
import { AccountTypeRow } from "./AccountTypeRow";
import { AccountNameCell } from "./AccountDetailDialog";
import { useUpdateAccountMutation, useDeleteAccountMutation } from "@/store/slices/accountSlice/api.account";

type AccountWithChildren = AccountDoc & { children: AccountWithChildren[] };

export const typeColors: Record<string, string> = {
  asset: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  liability: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  equity: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  income: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  expense: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

const typeOrder = ["asset", "liability", "equity", "income", "expense"];
export const typeLabels: Record<string, string> = {
  asset: "Assets",
  liability: "Liabilities",
  equity: "Equity",
  income: "Income",
  expense: "Expenses",
};

export function AccountsList({accounts}:{accounts:AccountDoc[]}) {
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(
    new Set(typeOrder)
  );
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const [updateAccount] = useUpdateAccountMutation();
  const [deleteAccount] = useDeleteAccountMutation();

  const toggleAccount = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await updateAccount({ id, isActive }).unwrap();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Account updated");
    },
    onError: () => {
      toast.error("Failed to update account");
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteAccount({ id }).unwrap();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Account deleted");
    },
    onError: () => {
      toast.error("Failed to delete account");
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

  // Group accounts by type
  const groupedAccounts = accounts?.reduce((acc, account) => {
    if (!acc[account.type]) {
      acc[account.type] = [];
    }
    acc[account.type].push(account);
    return acc;
  }, {} as Record<string, AccountDoc[]>);

  // Build tree structure with unlimited depth
  const buildTree = (accountsList: AccountDoc[]): AccountWithChildren[] => {
    const map = new Map<string, AccountWithChildren>();
    const roots: AccountWithChildren[] = [];

    accountsList.forEach((acc) => {
      map.set(
        String(acc._id),
        { ...acc, children: [] } as AccountWithChildren
      );
    });

    accountsList.forEach((acc) => {
      const node = map.get(String(acc._id))!;
      if (acc.parentAccount && map.has(String(acc.parentAccount))) {
        map.get(String(acc.parentAccount))!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    const sortChildren = (nodes: AccountWithChildren[]) => {
      nodes.sort((a, b) => (a.code || "").localeCompare(b.code || ""));
      nodes.forEach((node) => sortChildren(node.children));
    };
    sortChildren(roots);

    return roots;
  };

  const renderAccountRow = (account: AccountWithChildren, depth: number): JSX.Element[] => {
    const rows: JSX.Element[] = [];
    const hasChildren = account.children.length > 0;
    const isExpanded = expandedAccounts.has(String(account._id));
    const indentPx = depth * 24 + 16;

    rows.push(
      <TableRow 
        key={String(account._id)} 
        className={cn(
          !account.isActive && "opacity-50",
          hasChildren && "bg-muted/30 hover:bg-muted/50",
          !hasChildren && "hover:bg-muted/20"
        )}
      >
        <TableCell 
          className="font-mono cursor-pointer" 
          style={{ paddingLeft: `${indentPx}px` }}
          onClick={() => hasChildren && toggleAccountExpand(String(account._id))}
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
            <span>{account.code || "-"}</span>
          </div>
        </TableCell>
        <TableCell 
          className={cn("cursor-pointer", hasChildren && "font-semibold")}
        >
          <AccountNameCell account={account} />
        </TableCell>
        <TableCell>
          {!hasChildren && (
            <Badge variant="outline" className={typeColors[account.type]}>
              {account.type}
            </Badge>
          )}
        </TableCell>
        <TableCell className="text-right font-mono">
          {!hasChildren && (
            <>৳{Number(account.balance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</>
          )}
        </TableCell>
        <TableCell>
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
                    toggleAccount.mutate({ id: String(account._id), isActive: !account.isActive })
                  }
                >
                  {account.isActive ? "Deactivate" : "Activate"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => deleteAccountMutation.mutate(String(account._id))}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </TableCell>
      </TableRow>
    );

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

            const totalBalance = typeAccounts.reduce(
              (sum, acc) => sum + Number(acc.balance),
              0
            );

            return (
              <AccountTypeRow
                type={type}
                typeAccounts={typeAccounts}
                isExpanded={isExpanded}
                totalBalance={totalBalance}
                toggleType={toggleType}
                tree={tree}
                renderAccountRow={renderAccountRow}
              />
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
