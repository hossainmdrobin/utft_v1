"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, DollarSign, UserCheck, Clock, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useGetMembersQuery } from "@/store/slices/memberSlice/api.member";
import { useGetSettingsQuery } from "@/store/slices/settingSlice/api.setting";
import { useGetAuditLogsQuery } from "@/store/slices/auditLogSlice/api.auditLog";
import { useGetInstallmentsQuery } from "@/store/slices/paymentSlice/api.slice";
import { monthArray } from "@/lib/date/dhaka";

export default function Dashboard() {
  const { data: membersData, isLoading: membersLoading } = useGetMembersQuery();
  const { data: settings, isLoading: settingsLoading } = useGetSettingsQuery();
  const { data: auditLogs, isLoading: activityLoading } = useGetAuditLogsQuery();
  const { data: installmentsData, isLoading: installmentsLoading } = useGetInstallmentsQuery();

  const members = membersData?.data ?? [];
  const totalMembers = members.length;
  const activeMembers = members.filter((m) => m.stage === "approved").length;
  const pendingMembers = members.filter((m) => m.stage === "pending").length;
  const totalShares = members
    .filter((m) => m.stage === "approved")
    .reduce((sum, m) => sum + (m.share_quantity || 0), 0);
  const sharePrice = settings?.data?.share_value ?? 1000;
  const totalShareValue = totalShares * sharePrice;

  const statsLoading = membersLoading || settingsLoading;

  const recentMembers = [...members]
    .sort((a, b) => new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime())
    .slice(0, 5);

  const pendingApprovals = [...members]
    .filter((m) => m.stage === "pending")
    .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
    .slice(0, 5);

  const recentActivity = [...(auditLogs ?? [])]
    .sort((a, b) => new Date(b.changed_at ?? 0).getTime() - new Date(a.changed_at ?? 0).getTime())
    .slice(0, 10);

  const recentInstallments = (installmentsData?.data ?? []).slice(0, 5);

  const statsCards = [
    {
      title: "Total Members",
      value: statsLoading ? "..." : totalMembers.toString(),
      change: "",
      icon: Users,
      color: "text-primary",
    },
    {
      title: "Active Members",
      value: statsLoading ? "..." : activeMembers.toString(),
      change: "",
      icon: UserCheck,
      color: "text-accent",
    },
    {
      title: "Pending Approvals",
      value: statsLoading ? "..." : pendingMembers.toString(),
      change: "",
      icon: Clock,
      color: "text-orange-500",
    },
    {
      title: "Total Share Capital",
      value: statsLoading ? "..." : `৳${totalShareValue.toLocaleString()}`,
      change: `${totalShares} shares`,
      icon: DollarSign,
      color: "text-primary",
    },
  ];

  function memberJoinedUpdated(member: { created_at?: string; updated_at?: string }) {
    const created = member.created_at ? new Date(member.created_at) : null;
    const updated = member.updated_at ? new Date(member.updated_at) : null;
    const same = created && updated && created.getTime() === updated.getTime();
    if (same || !updated) {
      return { label: "Joined", date: created };
    }
    return { label: "Updated", date: updated };
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Welcome back!</h2>
        <p className="text-muted-foreground mt-1">
          Here's what's happening with your trust today.
        </p>
      </div>

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

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Recent Members</CardTitle>
          </CardHeader>
          <CardContent>
            {membersLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : recentMembers.length > 0 ? (
              <div className="space-y-3">
                {recentMembers.map((member) => {
                  const { label, date } = memberJoinedUpdated(member);
                  return (
                    <Link
                      key={member._id || member.id}
                      href={`/members/${member._id || member.id}`}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
                    >
                      <div>
                        <p className="font-medium text-foreground">{member.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {label} {format(date ?? new Date(member.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                      <Badge variant={member.stage === "approved" ? "default" : "secondary"}>
                        {member.member_type}
                      </Badge>
                    </Link>
                  );
                })}
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
            {membersLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : pendingApprovals.length > 0 ? (
              <div className="space-y-3">
                {pendingApprovals.map((member) => (
                  <Link
                    key={member._id || member.id}
                    href={`/members/${member._id || member.id}`}
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

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Recent Installments</CardTitle>
          </CardHeader>
          <CardContent>
            {installmentsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : recentInstallments.length > 0 ? (
              <div className="space-y-2">
                {recentInstallments.map((installment) => (
                  <div
                    key={String(installment._id)}
                    className="flex items-center justify-between p-2 rounded hover:bg-accent"
                  >
                    <div className="flex-1">
                      <p className="text-sm text-foreground">
                        {installment.member.full_name || "Unknown member"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {monthArray[(installment.month ?? 1) - 1]} {installment.year ?? ""} •{" "}
                        {format(new Date(installment.created_at ?? Date.now()), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">
                        ৳{Number(installment.amount ?? 0).toLocaleString()}
                      </p>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {installment.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No installments yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : recentActivity.length > 0 ? (
            <div className="space-y-2">
              {recentActivity.map((activity) => (
                <div
                   key={String(activity._id)}
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
  );
}
