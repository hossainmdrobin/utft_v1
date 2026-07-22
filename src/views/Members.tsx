"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Upload, Users as UsersIcon, MoreVertical } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddMemberDialog } from "@/components/members/AddMemberDialog";
import { BulkUploadDialog } from "@/components/members/BulkUploadDialog";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/mongodb/client";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAdmin } from "@/hooks/use-admin";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { PaymentStatusBadge } from "@/components/members/PaymentStatusBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Members() {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [receivables, setReceivables] = useState<Record<string, { amount: number; status: string }>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { isAdmin } = useAdmin();
  const router = useRouter();

  const fetchMembers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("members")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch members"
      });
    } else {
      setMembers(data || []);
      // Fetch receivables for all members
      await fetchReceivables(data || []);
    }
    setLoading(false);
  };

  const fetchReceivables = async (membersList: any[]) => {
    const receivablesMap: Record<string, { amount: number; status: string }> = {};

    for (const member of membersList) {
      try {
        const { data } = await supabase.rpc("get_member_financial_summary", {
          p_member_id: member.id,
        });

        if (data && data.length > 0) {
          receivablesMap[member.id] = {
            amount: Number(data[0].grand_total_due) || 0,
            status: data[0].payment_status || "cleared",
          };
        } else {
          receivablesMap[member.id] = { amount: 0, status: "cleared" };
        }
      } catch {
        receivablesMap[member.id] = { amount: 0, status: "cleared" };
      }
    }

    setReceivables(receivablesMap);
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleApprove = async (memberId: string) => {
    try {
      const { error } = await supabase.rpc("approve_member", { p_member_id: memberId });
      if (error) throw error;

      toast({
        title: "Success",
        description: "Member approved and Beneficiary ID generated"
      });
      fetchMembers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to approve member"
      });
    }
  };

  const handleReject = async (memberId: string) => {
    try {
      const { error } = await supabase.rpc("reject_member", { p_member_id: memberId });
      if (error) throw error;

      toast({
        title: "Success",
        description: "Member rejected"
      });
      fetchMembers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to reject member"
      });
    }
  };

  const handleStatusChange = async (memberId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'deceased') {
        updateData.deceased_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("members")
        .update(updateData)
        .eq("id", memberId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Member status updated to ${newStatus}`
      });
      fetchMembers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update member status"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      active: "default",
      inactive: "secondary",
      deceased: "destructive"
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Member Management</h2>
            <p className="text-muted-foreground mt-1">
              Manage all trust members and their information
            </p>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <Button variant="outline" className="gap-2" onClick={() => setBulkUploadOpen(true)}>
                <Upload className="h-4 w-4" />
                Bulk Upload
              </Button>
            )}
            <Button className="gap-2" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Member
            </Button>
          </div>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Members</TabsTrigger>
            <TabsTrigger value="pending">Pending Approval</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="deceased">Deceased</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {/* Search and Filters */}
            <Card className="shadow-soft">
              <CardContent className="pt-6">
                <div className="flex flex-col gap-4 md:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or Beneficiary ID..."
                      className="pl-10"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline">Filter by Type</Button>
                    <Button variant="outline">Export</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Members List */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Member List ({members.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : members.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <UsersIcon className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      No members yet
                    </h3>
                    <p className="text-muted-foreground mb-6 max-w-sm">
                      Get started by adding your first member or uploading a CSV/Excel file with member data.
                    </p>
                    <div className="flex gap-2">
                      <Button className="gap-2" onClick={() => setAddDialogOpen(true)}>
                        <Plus className="h-4 w-4" />
                        Add First Member
                      </Button>
                      <Button variant="outline" className="gap-2">
                        <Upload className="h-4 w-4" />
                        Upload CSV
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Beneficiary ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Member Type</TableHead>
                          <TableHead>Share Qty</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Payment Status</TableHead>
                          <TableHead>Mobile</TableHead>
                          <TableHead className="cursor-pointer hover:underline">Receivables</TableHead>
                          {isAdmin && <TableHead>Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {members.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell
                              className="font-medium cursor-pointer hover:underline"
                              onClick={() => router.push(`/members/${member.id}`)}
                            >
                              {member.beneficiary_id || "Pending"}
                            </TableCell>
                            <TableCell
                              className="cursor-pointer hover:underline"
                              onClick={() => router.push(`/members/${member.id}`)}
                            >
                              {member.full_name}
                            </TableCell>
                            <TableCell
                              className="capitalize cursor-pointer"
                              onClick={() => router.push(`/members/${member.id}`)}
                            >
                              {member.member_type}
                            </TableCell>
                            <TableCell
                              className="cursor-pointer"
                              onClick={() => router.push(`/members/${member.id}`)}
                            >
                              {member.share_quantity}
                            </TableCell>
                            <TableCell
                              className="cursor-pointer"
                              onClick={() => router.push(`/members/${member.id}`)}
                            >
                              {getStatusBadge(member.status)}
                            </TableCell>
                            <TableCell
                              className="cursor-pointer"
                              onClick={() => router.push(`/members/${member.id}`)}
                            >
                              <PaymentStatusBadge
                                status={receivables[member.id]?.status || "cleared"}
                              />
                            </TableCell>
                            <TableCell
                              className="cursor-pointer"
                              onClick={() => router.push(`/members/${member.id}`)}
                            >
                              {member.mobile}
                            </TableCell>
                            <TableCell
                              className="font-semibold cursor-pointer text-primary hover:underline"
                              onClick={() => router.push(`/members/${member.id}/financial-report`)}
                            >
                              ৳{(receivables[member.id]?.amount || 0).toFixed(2)}
                            </TableCell>
                            {isAdmin && (
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <div className="flex gap-2">
                                  {member.status === "pending" ? (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleApprove(member.id)}
                                      >
                                        <Check className="h-4 w-4 text-green-600" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleReject(member.id)}
                                      >
                                        <X className="h-4 w-4 text-red-600" />
                                      </Button>
                                    </>
                                  ) : (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm">
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        {member.status !== 'active' && (
                                          <DropdownMenuItem
                                            onClick={() => handleStatusChange(member.id, 'active')}
                                          >
                                            Mark as Active
                                          </DropdownMenuItem>
                                        )}
                                        {member.status !== 'deceased' && (
                                          <DropdownMenuItem
                                            onClick={() => handleStatusChange(member.id, 'deceased')}
                                          >
                                            Mark as Deceased
                                          </DropdownMenuItem>
                                        )}
                                        {member.status !== 'inactive' && (
                                          <DropdownMenuItem
                                            onClick={() => handleStatusChange(member.id, 'inactive')}
                                          >
                                            Mark as Inactive
                                          </DropdownMenuItem>
                                        )}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Pending Approvals ({members.filter(m => m.status === 'pending').length})</CardTitle>
              </CardHeader>
              <CardContent>
                {members.filter(m => m.status === 'pending').length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No pending member approvals
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Member Type</TableHead>
                        <TableHead>Share Qty</TableHead>
                        <TableHead>Mobile</TableHead>
                        {isAdmin && <TableHead>Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.filter(m => m.status === 'pending').map((member) => (
                        <TableRow
                          key={member.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push(`/members/${member.id}`)}
                        >
                          <TableCell>{member.full_name}</TableCell>
                          <TableCell className="capitalize">{member.member_type}</TableCell>
                          <TableCell>{member.share_quantity}</TableCell>
                          <TableCell>{member.mobile}</TableCell>
                          {isAdmin && (
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleApprove(member.id)}
                                >
                                  <Check className="h-4 w-4 text-green-600" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReject(member.id)}
                                >
                                  <X className="h-4 w-4 text-red-600" />
                                  Reject
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="active">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Active Members ({members.filter(m => m.status === 'active').length})</CardTitle>
              </CardHeader>
              <CardContent>
                {members.filter(m => m.status === 'active').length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No active members
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Beneficiary ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Member Type</TableHead>
                        <TableHead>Share Qty</TableHead>
                        <TableHead>Mobile</TableHead>
                        <TableHead className="cursor-pointer hover:underline">Receivables</TableHead>
                        {isAdmin && <TableHead>Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.filter(m => m.status === 'active').map((member) => (
                        <TableRow key={member.id}>
                          <TableCell
                            className="font-medium cursor-pointer hover:underline"
                            onClick={() => router.push(`/members/${member.id}`)}
                          >
                            {member.beneficiary_id}
                          </TableCell>
                          <TableCell
                            className="cursor-pointer hover:underline"
                            onClick={() => router.push(`/members/${member.id}`)}
                          >
                            {member.full_name}
                          </TableCell>
                          <TableCell
                            className="capitalize cursor-pointer"
                            onClick={() => router.push(`/members/${member.id}`)}
                          >
                            {member.member_type}
                          </TableCell>
                          <TableCell
                            className="cursor-pointer"
                            onClick={() => router.push(`/members/${member.id}`)}
                          >
                            {member.share_quantity}
                          </TableCell>
                          <TableCell
                            className="cursor-pointer"
                            onClick={() => router.push(`/members/${member.id}`)}
                          >
                            {member.mobile}
                          </TableCell>
                          <TableCell
                            className="font-semibold cursor-pointer text-primary hover:underline"
                            onClick={() => router.push(`/members/${member.id}/financial-report`)}
                          >
                            ৳{(receivables[member.id]?.amount || 0).toFixed(2)}
                          </TableCell>
                          {isAdmin && (
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => handleStatusChange(member.id, 'deceased')}
                                  >
                                    Mark as Deceased
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleStatusChange(member.id, 'inactive')}
                                  >
                                    Mark as Inactive
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deceased">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Deceased Members ({members.filter(m => m.status === 'deceased').length})</CardTitle>
              </CardHeader>
              <CardContent>
                {members.filter(m => m.status === 'deceased').length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No deceased members
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Beneficiary ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Member Type</TableHead>
                        <TableHead>Deceased Date</TableHead>
                        {isAdmin && <TableHead>Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.filter(m => m.status === 'deceased').map((member) => (
                        <TableRow key={member.id}>
                          <TableCell
                            className="font-medium cursor-pointer hover:underline"
                            onClick={() => router.push(`/members/${member.id}`)}
                          >
                            {member.beneficiary_id}
                          </TableCell>
                          <TableCell
                            className="cursor-pointer hover:underline"
                            onClick={() => router.push(`/members/${member.id}`)}
                          >
                            {member.full_name}
                          </TableCell>
                          <TableCell
                            className="capitalize cursor-pointer"
                            onClick={() => router.push(`/members/${member.id}`)}
                          >
                            {member.member_type}
                          </TableCell>
                          <TableCell
                            className="cursor-pointer"
                            onClick={() => router.push(`/members/${member.id}`)}
                          >
                            {member.deceased_at ? new Date(member.deceased_at).toLocaleDateString() : "N/A"}
                          </TableCell>
                          {isAdmin && (
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => handleStatusChange(member.id, 'active')}
                                  >
                                    Mark as Active
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleStatusChange(member.id, 'inactive')}
                                  >
                                    Mark as Inactive
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <AddMemberDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={fetchMembers}
      />
      <BulkUploadDialog
        open={bulkUploadOpen}
        onOpenChange={setBulkUploadOpen}
        onSuccess={fetchMembers}
      />
    </>
  );
}
