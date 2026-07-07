"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, DollarSign, TrendingUp, UserCheck, Clock, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  pendingMembers: number;
  totalShares: number;
  totalShareValue: number;
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async (): Promise<DashboardStats> => {
      const [membersResult, sharesResult, settingsResult] = await Promise.all([
        supabase.from("members").select("status, share_quantity"),
        supabase.from("share_transactions").select("share_quantity"),
        supabase.from("trust_settings").select("value").eq("key", "share_price").maybeSingle(),
      ]);

      if (membersResult.error) throw membersResult.error;
      if (sharesResult.error) throw sharesResult.error;

      const members = membersResult.data || [];
      const activeMembers = members.filter((m) => m.status === "active");
      const pendingMembers = members.filter((m) => m.status === "pending");
      const totalShares = activeMembers.reduce((sum, m) => sum + (m.share_quantity || 0), 0);
      const sharePrice = (settingsResult.data?.value as any)?.price || 1000;
      const totalShareValue = totalShares * sharePrice;

      return {
        totalMembers: members.length,
        activeMembers: activeMembers.length,
        pendingMembers: pendingMembers.length,
        totalShares,
        totalShareValue,
      };
    },
  });

  const { data: recentMembers, isLoading: recentLoading } = useQuery({
    queryKey: ["recent-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name, member_type, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
  });

  const { data: pendingApprovals, isLoading: pendingLoading } = useQuery({
    queryKey: ["pending-approvals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name, member_type, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
  });

  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: ["recent-activity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, action, description, changed_at, table_name")
        .order("changed_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  const statsCards = [
    {
      title: "Total Members",
      value: statsLoading ? "..." : stats?.totalMembers.toString() || "0",
      change: "",
      icon: Users,
      color: "text-primary",
    },
    {
      title: "Active Members",
      value: statsLoading ? "..." : stats?.activeMembers.toString() || "0",
      change: "",
      icon: UserCheck,
      color: "text-accent",
    },
    {
      title: "Pending Approvals",
      value: statsLoading ? "..." : stats?.pendingMembers.toString() || "0",
      change: "",
      icon: Clock,
      color: "text-orange-500",
    },
    {
      title: "Total Share Capital",
      value: statsLoading ? "..." : `à§³${stats?.totalShareValue.toLocaleString() || "0"}`,
      change: `${stats?.totalShares || 0} shares`,
      icon: DollarSign,
      color: "text-primary",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div>
          <h2 className="text-3xl font-bold text-foreground">Welcome back!</h2>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your trust today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statsCards.map((stat) => (
            <Card key={stat.title} className="shadow-soft">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                {stat.change && (
                  <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Recent Members</CardTitle>
            </CardHeader>
            <CardContent>
              {recentLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : recentMembers && recentMembers.length > 0 ? (
                <div className="space-y-3">
                  {recentMembers.map((member) => (
                    <Link
                      key={member.id}
                      href={`/members/${member.id}`}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
                    >
                      <div>
                        <p className="font-medium text-foreground">{member.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(member.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                      <Badge variant={member.status === "active" ? "default" : "secondary"}>
                        {member.member_type}
                      </Badge>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No members yet. Add your first member to get started.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : pendingApprovals && pendingApprovals.length > 0 ? (
                <div className="space-y-3">
                  {pendingApprovals.map((member) => (
                    <Link
                      key={member.id}
                      href={`/members/${member.id}`}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
                    >
                      <div>
                        <p className="font-medium text-foreground">{member.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(member.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                      <Badge variant="secondary">{member.member_type}</Badge>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No pending approvals
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : recentActivity && recentActivity.length > 0 ? (
              <div className="space-y-2">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-2 rounded hover:bg-accent"
                  >
                    <div className="flex-1">
                      <p className="text-sm text-foreground">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(activity.changed_at), "MMM d, yyyy HH:mm")}
                      </p>
                    </div>
                    <Badge variant="outline" className="ml-2">
                      {activity.action}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No recent activity
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

