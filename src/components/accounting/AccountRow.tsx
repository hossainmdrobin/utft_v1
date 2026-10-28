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
import { MoreVertical, Edit } from "lucide-react";
import { cn } from "@/lib/utils";
import { typeColors } from "./AccountsList";


export default ({ account }: { account: AccountDoc }): JSX.Element => {
    return (
        <TableRow
            key={String(account._id)}
            className={cn(
                !account.isActive && "opacity-50",
                "hover:bg-muted/20"
            )}
        >
            <TableCell className="font-mono">
                {account.code || "-"}
            </TableCell>
            <TableCell className="cursor-pointer">
                {account.name}
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className={typeColors[account.type]}>
                        {account.type}
                    </Badge>
                </div>
            </TableCell>
            <TableCell className="text-right font-mono">
                {(
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
                            onClick={() => {}}
                        >
                            {account.isActive ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </TableCell>
        </TableRow>
    );
};
