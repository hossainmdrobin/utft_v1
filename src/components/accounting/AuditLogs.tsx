import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { useAdmin } from "@/hooks/use-admin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  History,
  Trash2,
  Search,
  CalendarIcon,
  Lock,
  Unlock,
  Plus,
  Edit,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

const actionColors: Record<string, string> = {
  INSERT: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  UPDATE: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  DELETE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  LOCK: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  UNLOCK: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
};

const actionIcons: Record<string, React.ReactNode> = {
  INSERT: <Plus className="h-3 w-3" />,
  UPDATE: <Edit className="h-3 w-3" />,
  DELETE: <Trash2 className="h-3 w-3" />,
  LOCK: <Lock className="h-3 w-3" />,
  UNLOCK: <Unlock className="h-3 w-3" />,
};

const dateRangeOptions = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "last_3_months", label: "Last 3 Months" },
  { value: "all", label: "All Time" },
  { value: "custom", label: "Custom Range" },
];

export function AuditLogs() {
  const { isAdmin } = useAdmin();
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState("this_month");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [searchTerm, setSearchTerm] = useState("");
  const [tableFilter, setTableFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [selectedLogs, setSelectedLogs] = useState<string[]>([]);
  const [viewLog, setViewLog] = useState<any>(null);

  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit-logs", dateRange, customStartDate, customEndDate],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .eq("is_deleted", false)
        .order("changed_at", { ascending: false })
        .limit(500);

      const now = new Date();
      let startDate: Date | undefined;
      let endDate: Date | undefined;

      switch (dateRange) {
        case "today":
          startDate = new Date(now.setHours(0, 0, 0, 0));
          endDate = new Date();
          break;
        case "this_week":
          const dayOfWeek = now.getDay();
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - dayOfWeek);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date();
          break;
        case "this_month":
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        case "last_month":
          startDate = startOfMonth(subMonths(now, 1));
          endDate = endOfMonth(subMonths(now, 1));
          break;
        case "last_3_months":
          startDate = startOfMonth(subMonths(now, 2));
          endDate = endOfMonth(now);
          break;
        case "custom":
          startDate = customStartDate;
          endDate = customEndDate;
          break;
      }

      if (startDate) {
        query = query.gte("changed_at", startDate.toISOString());
      }
      if (endDate) {
        query = query.lte("changed_at", endDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const deleteLogs = useMutation({
    mutationFn: async (logIds: string[]) => {
      const { data: user } = await supabase.auth.getUser();
      
      // First, log the deletion action
      await supabase.from("audit_logs").insert({
        table_name: "audit_logs",
        record_id: "bulk-delete",
        action: "DELETE",
        action_type: "log_deletion",
        description: `Deleted ${logIds.length} log entries`,
        changed_by: user.user?.id,
        new_data: { deleted_count: logIds.length, deleted_ids: logIds.slice(0, 10) },
      });

      // Soft delete the logs
      const { error } = await supabase
        .from("audit_logs")
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: user.user?.id,
        })
        .in("id", logIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      toast.success("Logs deleted successfully");
      setDeleteConfirm(false);
      setSelectedLogs([]);
    },
    onError: () => {
      toast.error("Failed to delete logs");
    },
  });

  const filteredLogs = logs?.filter((log) => {
    let matches = true;

    if (tableFilter !== "all") {
      matches = matches && log.table_name === tableFilter;
    }

    if (actionFilter !== "all") {
      matches = matches && log.action === actionFilter;
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      matches =
        matches &&
        (log.description?.toLowerCase().includes(search) ||
          log.table_name.toLowerCase().includes(search) ||
          log.action.toLowerCase().includes(search));
    }

    return matches;
  });

  const uniqueTables = [...new Set(logs?.map((l) => l.table_name) || [])];
  const uniqueActions = [...new Set(logs?.map((l) => l.action) || [])];

  const toggleSelectLog = (id: string) => {
    setSelectedLogs((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAllLogs = () => {
    if (selectedLogs.length === filteredLogs?.length) {
      setSelectedLogs([]);
    } else {
      setSelectedLogs(filteredLogs?.map((l) => l.id) || []);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Audit Logs
          </CardTitle>
          <CardDescription>
            Track all changes, locks, and user activities in the system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-[200px]"
              />
            </div>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                {dateRangeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {dateRange === "custom" && (
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(!customStartDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customStartDate ? format(customStartDate, "dd MMM yyyy") : "Start"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customStartDate}
                      onSelect={setCustomStartDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground">to</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(!customEndDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customEndDate ? format(customEndDate, "dd MMM yyyy") : "End"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customEndDate}
                      onSelect={setCustomEndDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <Select value={tableFilter} onValueChange={setTableFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Table" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tables</SelectItem>
                {uniqueTables.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActions.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isAdmin && selectedLogs.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteConfirm(true)}
                className="ml-auto"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete {selectedLogs.length} logs
              </Button>
            )}
          </div>

          {/* Logs Table */}
          {!filteredLogs?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No audit logs found</p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    {isAdmin && (
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedLogs.length === filteredLogs.length}
                          onChange={selectAllLogs}
                          className="rounded"
                        />
                      </TableHead>
                    )}
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-16">View</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.slice(0, 100).map((log) => (
                    <TableRow key={log.id}>
                      {isAdmin && (
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedLogs.includes(log.id)}
                            onChange={() => toggleSelectLog(log.id)}
                            className="rounded"
                          />
                        </TableCell>
                      )}
                      <TableCell className="text-sm">
                        {format(new Date(log.changed_at), "dd MMM yyyy HH:mm:ss")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("flex items-center gap-1 w-fit", actionColors[log.action])}
                        >
                          {actionIcons[log.action]}
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{log.table_name}</TableCell>
                      <TableCell className="max-w-[300px] truncate text-sm">
                        {log.description || "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setViewLog(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {filteredLogs && filteredLogs.length > 100 && (
            <p className="text-sm text-muted-foreground text-center">
              Showing 100 of {filteredLogs.length} logs
            </p>
          )}
        </CardContent>
      </Card>

      {/* View Log Dialog */}
      <AlertDialog open={!!viewLog} onOpenChange={() => setViewLog(null)}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Log Details</AlertDialogTitle>
          </AlertDialogHeader>
          {viewLog && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Timestamp</p>
                    <p className="font-medium">
                      {format(new Date(viewLog.changed_at), "dd MMM yyyy HH:mm:ss")}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Action</p>
                    <Badge variant="outline" className={actionColors[viewLog.action]}>
                      {viewLog.action}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Table</p>
                    <p className="font-mono">{viewLog.table_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Record ID</p>
                    <p className="font-mono text-xs break-all">{viewLog.record_id}</p>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Description</p>
                  <p>{viewLog.description || "No description"}</p>
                </div>
                {viewLog.old_data && (
                  <div>
                    <p className="text-muted-foreground text-sm mb-1">Previous Data</p>
                    <pre className="bg-muted p-3 rounded text-xs overflow-auto">
                      {JSON.stringify(viewLog.old_data, null, 2)}
                    </pre>
                  </div>
                )}
                {viewLog.new_data && (
                  <div>
                    <p className="text-muted-foreground text-sm mb-1">New Data</p>
                    <pre className="bg-muted p-3 rounded text-xs overflow-auto">
                      {JSON.stringify(viewLog.new_data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Logs</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedLogs.length} log entries? This action will be
              logged for audit purposes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteLogs.mutate(selectedLogs)}
              className="bg-destructive text-destructive-foreground"
            >
              Delete Logs
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
