import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";


export default function MemberFilter({ filters, setFilters }) {
    const updateFilter = (key: string, value: string) => {
        setFilters((prev) => {
            const next = { ...prev };
            if (value) {
                next[key] = value;
            } else {
                delete next[key];
            }
            return next;
        });
    };
    const resetFilters = () => {
        setFilters({});
    };
    return (
        <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px] max-w-[300px]">
                <Label className="text-xs text-muted-foreground mb-1 block">Search</Label>
                <Input
                    placeholder="Name, NID, mobile..."
                    value={filters.search || ""}
                    onChange={(e) => updateFilter("search", e.target.value)}
                />
            </div>
            <div className="min-w-[150px]">
                <Label className="text-xs text-muted-foreground mb-1 block">Stage</Label>
                <Select
                    value={filters.stage}
                    onValueChange={(v) => updateFilter("stage", v)}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="All stages" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="initiated">Initiated</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="min-w-[150px]">
                <Label className="text-xs text-muted-foreground mb-1 block">Role</Label>
                <Select
                    value={filters.role}
                    onValueChange={(v) => updateFilter("role", v)}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="All roles" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="president">President</SelectItem>
                        <SelectItem value="director">Director</SelectItem>
                        <SelectItem value="accountant">Accountant</SelectItem>
                        <SelectItem value="auditor">Auditor</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="min-w-[150px]">
                <Label className="text-xs text-muted-foreground mb-1 block">Member Type</Label>
                <Select
                    value={filters.member_type}
                    onValueChange={(v) => updateFilter("member_type", v)}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="founding">Founding</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="min-w-[140px]">
                <Label className="text-xs text-muted-foreground mb-1 block">Join Date From</Label>
                <Input
                    type="date"
                    value={filters.joinDateFrom || ""}
                    onChange={(e) => updateFilter("joinDateFrom", e.target.value)}
                />
            </div>
            <div className="min-w-[140px]">
                <Label className="text-xs text-muted-foreground mb-1 block">Join Date To</Label>
                <Input
                    type="date"
                    value={filters.joinDateTo || ""}
                    onChange={(e) => updateFilter("joinDateTo", e.target.value)}
                />
            </div>
            <div className="min-w-[150px]">
                <Label className="text-xs text-muted-foreground mb-1 block">User ID</Label>
                <Input
                    placeholder="Filter by user ID"
                    value={filters.user_id || ""}
                    onChange={(e) => updateFilter("user_id", e.target.value)}
                />
            </div>
            <Button variant="outline" size="sm" onClick={resetFilters}>
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset Filters
            </Button>
        </div>
    )
}
