"use client";
import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/use-admin";
import { Shield, ShieldOff, Loader2, UserPlus, Search, Users } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface UserWithRole {
  id: string;
  email: string;
  created_at: string;
  roles: Array<{ role: string }>;
}

export default function UserManagement() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [roleChangeDialog, setRoleChangeDialog] = useState<{
    open: boolean;
    userId: string | null;
    userEmail: string | null;
    action: "promote" | "demote" | null;
  }>({
    open: false,
    userId: null,
    userEmail: null,
    action: null,
  });

  // Fetch users from members table that have user_id and also user_roles
  const { data: users, isLoading } = useQuery({
    queryKey: ["users-with-roles"],
    queryFn: async () => {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      // Get all user roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role, created_at");

      if (rolesError) throw rolesError;

      // Get members with user_id to find associated users
      const { data: members, error: membersError } = await supabase
        .from("members")
        .select("user_id, full_name, email")
        .not("user_id", "is", null);

      if (membersError) throw membersError;

      // Create a map of unique users
      const userMap = new Map<string, UserWithRole>();

      // Add current user if they exist
      if (currentUser) {
        userMap.set(currentUser.id, {
          id: currentUser.id,
          email: currentUser.email || "",
          created_at: currentUser.created_at || new Date().toISOString(),
          roles: roles.filter(r => r.user_id === currentUser.id).map(r => ({ role: r.role })),
        });
      }

      // Add users from roles
      roles.forEach((role) => {
        if (!userMap.has(role.user_id)) {
          const member = members.find(m => m.user_id === role.user_id);
          userMap.set(role.user_id, {
            id: role.user_id,
            email: member?.email || "Unknown",
            created_at: role.created_at,
            roles: [],
          });
        }
        const user = userMap.get(role.user_id)!;
        if (!user.roles.some(r => r.role === role.role)) {
          user.roles.push({ role: role.role });
        }
      });

      // Add members without roles
      members.forEach((member) => {
        if (member.user_id && !userMap.has(member.user_id)) {
          userMap.set(member.user_id, {
            id: member.user_id,
            email: member.email || member.full_name,
            created_at: new Date().toISOString(),
            roles: [],
          });
        }
      });

      return Array.from(userMap.values());
    },
    enabled: isAdmin,
  });

  const roleChangeMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: "promote" | "demote" }) => {
      if (action === "promote") {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: "admin" });
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", "admin");
        
        if (error) throw error;
      }
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast.success(
        action === "promote" 
          ? "User promoted to admin successfully" 
          : "Admin privileges removed successfully"
      );
      setRoleChangeDialog({ open: false, userId: null, userEmail: null, action: null });
    },
    onError: (error: Error) => {
      toast.error("Failed to update user role: " + error.message);
    },
  });

  const addUserMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      // Sign up new user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      
      // Assign user role
      if (data.user) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: data.user.id, role: "user" });
        
        if (roleError) throw roleError;
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast.success("User created successfully");
      setAddUserOpen(false);
      setNewUserEmail("");
      setNewUserPassword("");
    },
    onError: (error: Error) => {
      toast.error("Failed to create user: " + error.message);
    },
  });

  const handleRoleChange = (userId: string, userEmail: string, action: "promote" | "demote") => {
    setRoleChangeDialog({ open: true, userId, userEmail, action });
  };

  const confirmRoleChange = () => {
    if (roleChangeDialog.userId && roleChangeDialog.action) {
      roleChangeMutation.mutate({
        userId: roleChangeDialog.userId,
        action: roleChangeDialog.action,
      });
    }
  };

  const handleAddUser = () => {
    if (!newUserEmail || !newUserPassword) {
      toast.error("Please provide email and password");
      return;
    }
    addUserMutation.mutate({ email: newUserEmail, password: newUserPassword });
  };

  const filteredUsers = users?.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (adminLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              You don't have permission to access this page.
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground">User Management</h2>
            <p className="text-muted-foreground mt-1">
              Manage user roles and permissions
            </p>
          </div>
          <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleAddUser} 
                  className="w-full"
                  disabled={addUserMutation.isPending}
                >
                  {addUserMutation.isPending ? "Creating..." : "Create User"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Users
            </CardTitle>
            <CardDescription>
              View and manage user roles. Only admins can promote or demote users.
            </CardDescription>
            <div className="pt-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredUsers && filteredUsers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const isUserAdmin = user.roles.some((r) => r.role === "admin");
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>
                          {user.roles.length > 0 ? (
                            <div className="flex gap-1 flex-wrap">
                              {user.roles.map((r, idx) => (
                                <Badge key={idx} variant={r.role === "admin" ? "default" : "secondary"}>
                                  {r.role}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <Badge variant="outline">User</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {isUserAdmin ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRoleChange(user.id, user.email, "demote")}
                              disabled={roleChangeMutation.isPending}
                            >
                              <ShieldOff className="h-4 w-4 mr-1" />
                              Remove Admin
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRoleChange(user.id, user.email, "promote")}
                              disabled={roleChangeMutation.isPending}
                            >
                              <Shield className="h-4 w-4 mr-1" />
                              Make Admin
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No users found</p>
                <p className="text-sm mt-1">Users will appear here after they sign up</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={roleChangeDialog.open} onOpenChange={(open) => 
        setRoleChangeDialog({ open, userId: null, userEmail: null, action: null })
      }>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {roleChangeDialog.action === "promote" ? "Promote to Admin" : "Remove Admin Role"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {roleChangeDialog.action === "promote" 
                ? `Are you sure you want to promote ${roleChangeDialog.userEmail} to admin? They will have full access to all features.`
                : `Are you sure you want to remove admin privileges from ${roleChangeDialog.userEmail}? They will lose access to admin features.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
