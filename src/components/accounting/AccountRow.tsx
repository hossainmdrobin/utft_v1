import {
    TableCell,
    TableRow,
} from "@/components/ui/table";
import { AccountDoc } from "@/models/Account";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, ChevronRight, ChevronDown, Folder, FolderOpen, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { typeColors } from "./AccountsList";
import { useGetEntryLinesQuery } from "@/store/slices/entryLineSlice/api.entryLine";


export default ({ account }: { account: AccountDoc }): JSX.Element => {
    const hasChildren = false; // account.children && account.children.length > 0;
    const {data: entryLines} = useGetEntryLinesQuery({ account_id: String(account._id) });
    const subResult = (entryLines?.totalDebit - entryLines?.totalCredit) || 0;
    console.log(entryLines, "Entry line data")

    return (
        <TableRow
            key={String(account._id)}
            className={cn(
                !account.is_active && "opacity-50",
                hasChildren && "bg-muted/30 hover:bg-muted/50",
                !hasChildren && "hover:bg-muted/20"
            )}
        >
            <TableCell
                className="font-mono cursor-pointer"
                style={{ paddingLeft: `${'30'}px` }}
            // onClick={() => hasChildren && toggleAccountExpand(String(account._id))}
            >
                {/* <div className="flex items-center gap-2">
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
                </div> */}
            </TableCell>
            <TableCell
                className={cn("cursor-pointer", hasChildren && "font-semibold")}
            // onClick={() => hasChildren && toggleAccountExpand(String(account._id))}
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
            {entryLines && (
                <TableCell className="text-right font-mono">
                    { (
                        <>৳{Number(subResult).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</>
                    )}
                </TableCell>
            )}
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
                                // onClick={() =>
                                //     toggleAccount.mutate({ id: String(account._id), is_active: !account.is_active })
                                // }
                            >
                                {account.is_active ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </TableCell>
        </TableRow>
    );

    // // Render children if expanded
    // if (hasChildren && isExpanded) {
    //   account.children.forEach((child) => {
    //     rows.push(...renderAccountRow(child, depth + 1));
    //   });
    // }
};