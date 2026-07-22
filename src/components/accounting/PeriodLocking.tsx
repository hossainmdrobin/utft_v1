import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/mongodb/client";
import { toast } from "sonner";
import { format } from "date-fns";
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
import { Lock, Unlock, Calendar, Plus, Shield } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

export function PeriodLocking() {
  const { isAdmin } = useAdmin();
  const queryClient = useQueryClient();
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: "lock" | "unlock";
    periodId?: string;
    month?: number;
    year?: number;
  }>({ open: false, action: "lock" });
  const [newPeriod, setNewPeriod] = useState({ month: "", year: "" });

  const { data: periods, isLoading } = useQuery({
    queryKey: ["accounting-periods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounting_periods")
        .select("*")
        .order("year", { ascending: false })
        .order("month", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createPeriod = useMutation({
    mutationFn: async ({ month, year }: { month: number; year: number }) => {
      const { error } = await supabase
        .from("accounting_periods")
        .insert({ month, year, is_locked: false });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting-periods"] });
      toast.success("Period created");
      setNewPeriod({ month: "", year: "" });
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast.error("This period already exists");
      } else {
        toast.error("Failed to create period");
      }
    },
  });

  const lockPeriod = useMutation({
    mutationFn: async ({ id, lock }: { id: string; lock: boolean }) => {
      const { data: user } = await supabase.auth.getUser();
      const update = lock
        ? { is_locked: true, locked_at: new Date().toISOString(), locked_by: user.user?.id }
        : { is_locked: false, unlocked_at: new Date().toISOString(), unlocked_by: user.user?.id };
      
      const { error } = await supabase
        .from("accounting_periods")
        .update(update)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { lock }) => {
      queryClient.invalidateQueries({ queryKey: ["accounting-periods"] });
      toast.success(lock ? "Period locked successfully" : "Period unlocked successfully");
      setConfirmDialog({ open: false, action: "lock" });
    },
    onError: () => {
      toast.error("Failed to update period");
    },
  });

  const handleAction = (action: "lock" | "unlock", periodId: string, month: number, year: number) => {
    setConfirmDialog({ open: true, action, periodId, month, year });
  };

  const confirmAction = () => {
    if (confirmDialog.periodId) {
      lockPeriod.mutate({ id: confirmDialog.periodId, lock: confirmDialog.action === "lock" });
    }
  };

  const handleCreatePeriod = () => {
    if (newPeriod.month && newPeriod.year) {
      createPeriod.mutate({
        month: parseInt(newPeriod.month),
        year: parseInt(newPeriod.year),
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Period Locking</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Accounting Period Locking
        </CardTitle>
        <CardDescription>
          Lock accounting periods to prevent modifications. Only admins can unlock.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdmin && (
          <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/50">
            <Select value={newPeriod.month} onValueChange={(v) => setNewPeriod({ ...newPeriod, month: v })}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((m, i) => (
                  <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={newPeriod.year} onValueChange={(v) => setNewPeriod({ ...newPeriod, year: v })}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={handleCreatePeriod}
              disabled={!newPeriod.month || !newPeriod.year || createPeriod.isPending}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Period
            </Button>
          </div>
        )}

        {!periods?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No accounting periods defined yet</p>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Locked At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.map((period) => (
                  <TableRow key={period.id}>
                    <TableCell className="font-medium">
                      {months[period.month - 1]} {period.year}
                    </TableCell>
                    <TableCell>
                      {period.is_locked ? (
                        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                          <Lock className="h-3 w-3 mr-1" />
                          Locked
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <Unlock className="h-3 w-3 mr-1" />
                          Open
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {period.locked_at
                        ? format(new Date(period.locked_at), "dd MMM yyyy HH:mm")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {period.is_locked ? (
                        isAdmin ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAction("unlock", period.id, period.month, period.year)}
                          >
                            <Unlock className="h-4 w-4 mr-1" />
                            Unlock
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                            <Shield className="h-3 w-3" />
                            Admin only
                          </span>
                        )
                      ) : (
                        isAdmin && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleAction("lock", period.id, period.month, period.year)}
                          >
                            <Lock className="h-4 w-4 mr-1" />
                            Lock
                          </Button>
                        )
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmDialog.action === "lock" ? "Lock Period" : "Unlock Period"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirmDialog.action === "lock"
                  ? `Are you sure you want to lock ${months[(confirmDialog.month || 1) - 1]} ${confirmDialog.year}? No modifications will be allowed to entries in this period.`
                  : `Are you sure you want to unlock ${months[(confirmDialog.month || 1) - 1]} ${confirmDialog.year}? This will allow modifications to entries in this period.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmAction}
                className={confirmDialog.action === "lock" ? "bg-destructive text-destructive-foreground" : ""}
              >
                {confirmDialog.action === "lock" ? "Lock Period" : "Unlock Period"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
