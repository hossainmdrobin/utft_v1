"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  DollarSign, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  CreditCard, 
  Receipt, 
  Bell, 
  User, 
  ArrowRight,
  Clock,
  Loader2
} from "lucide-react";
import { useGetCurrentUserQuery } from "@/store/slices/authSlice/api.auth";
import { useGetInstallmentsQuery, useGetGatewayTransactionsQuery } from "@/store/slices/paymentSlice/api.slice";
import { useGetSettingsQuery } from "@/store/slices/settingSlice/api.setting";
// import { useGetAnnouncementsQuery } from "@/store/slices/announcementSlice/api.announcement";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { format } from "date-fns";
import { getCurrentDhakaDate, monthArray } from "@/lib/date/dhaka";
import { calculateFinancialSummary, getInstallmentStatus, mapInstallmentToRecord } from "./payments/installment-logic";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function MemberDashboard() {
  const { data: currentUserData, isLoading: userLoading } = useGetCurrentUserQuery();
  const member = currentUserData?.data;
  const memberId = member?._id;

  const { data: settings, isLoading: settingsLoading } = useGetSettingsQuery();
  const { day, month, year } = getCurrentDhakaDate();
  const defaultDueDay = settings?.data?.default_due_day ?? 10;

  const { data: installmentData, isLoading: installmentsLoading } = useGetInstallmentsQuery(
    { member: String(memberId) }, 
    { skip: !memberId }
  );

  const { data: gatewayData, isLoading: gatewayLoading } = useGetGatewayTransactionsQuery(
    { member: String(memberId) },
    { skip: !memberId }
  );

  // Try to get announcements if API exists
  let announcements: any[] = [];
  let announcementsLoading = false;
  // try {
  //   const announcementsQuery = useGetAnnouncementsQuery?.({} as any);
  //   if (announcementsQuery) {
  //     announcements = announcementsQuery.data?.data || [];
  //     announcementsLoading = announcementsQuery.isLoading;
  //   }
  // } catch (e) {
  //   // Announcements API might not exist
  // }

  const records = (installmentData?.data ?? []).map((doc: any) => 
    mapInstallmentToRecord(doc, defaultDueDay)
  );

  const summary = calculateFinancialSummary(records, new Date());
  
  const totalContributions = records
    .filter(r => r.status === "PAID")
    .reduce((sum, r) => sum + r.amount, 0);

  const paidInstallmentsThisYear = records.filter(r => {
    if (r.status !== "PAID") return false;
    const recordYear = parseInt(r.period.split('-')[0]);
    return recordYear === year;
  }).length;

  const totalInstallmentsThisYear = records.filter(r => {
    const recordYear = parseInt(r.period.split('-')[0]);
    return recordYear === year;
  }).length;

  const nextUnpaidInstallment = records.find(r => r.status !== "PAID");
  const nextInstallmentStatus = nextUnpaidInstallment 
    ? getInstallmentStatus(nextUnpaidInstallment, new Date()) 
    : "PAID";

  const recentPayments = (gatewayData?.data || [])
    .slice(0, 5)
    .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

  const isLoading = userLoading || settingsLoading || installmentsLoading || gatewayLoading;

  const currencySymbol = settings?.data?.currency_symbol ?? "৳";
  const formatCurrency = (amount: number) => `${currencySymbol}${Number(amount ?? 0).toLocaleString()}`;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="h-6 bg-muted rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-32 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="h-6 bg-muted rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-32 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Welcome back, {member?.full_name?.split(' ')[0] || 'Member'}!</h2>
        <p className="text-muted-foreground mt-1">
          Here's your association financial overview
        </p>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Contributions
            </CardTitle>
            <DollarSign className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatCurrency(totalContributions)}</div>
            <p className="text-xs text-muted-foreground mt-1">Total paid amount</p>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Installment
            </CardTitle>
            <Calendar className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(summary.monthlyInstallment)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Current amount</p>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Paid Installments
            </CardTitle>
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {paidInstallmentsThisYear} / {totalInstallmentsThisYear || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{year} year</p>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Due Installments
            </CardTitle>
            <AlertCircle className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(summary.totalDueAmount + summary.totalFineAmount)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total unpaid</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Upcoming Installment */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Upcoming Installment
            </CardTitle>
            <CardDescription>Next payment due</CardDescription>
          </CardHeader>
          <CardContent>
            {nextUnpaidInstallment ? (
              <div className="space-y-4">
                <div>
                  <p className="text-lg font-semibold">
                    {monthArray[parseInt(nextUnpaidInstallment.period.split('-')[1]) - 1]} {nextUnpaidInstallment.period.split('-')[0]}
                  </p>
                  <p className="text-3xl font-bold text-primary mt-2">
                    {formatCurrency(nextUnpaidInstallment.amount)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Due: {format(new Date(nextUnpaidInstallment.dueDate), "MMM dd, yyyy")}
                  </p>
                  <Badge className="mt-2" variant={nextInstallmentStatus === "OVERDUE" ? "destructive" : nextInstallmentStatus === "DUE" ? "secondary" : "outline"}>
                    {nextInstallmentStatus.replace("_", " ")}
                  </Badge>
                </div>
                <Link href="/app/dashboard/payments">
                  <Button className="w-full">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pay Now
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-6">
                <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-2" />
                <p className="font-medium">All installments paid!</p>
                <p className="text-sm text-muted-foreground">You're up to date</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Member Profile Summary */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Summary
            </CardTitle>
            <CardDescription>Your membership details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4 mb-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={member?.profile_photo || ""} />
                <AvatarFallback className="text-lg">
                  {member?.full_name ? member.full_name.split(" ").map((n: string) => n[0]).join("") : "M"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-lg">{member?.full_name}</p>
                <p className="text-sm text-muted-foreground">Member ID: {member?.user_id}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Membership Status</span>
                <Badge variant={member?.stage === "approved" ? "default" : "secondary"}>
                  {member?.stage || "N/A"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Member Type</span>
                <span className="font-medium">{member?.member_type || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monthly Installment</span>
                <span className="font-medium">{formatCurrency(summary.monthlyInstallment)}</span>
              </div>
              {member?.joinDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Joining Date</span>
                  <span className="font-medium">{format(new Date(member.joinDate), "MMM dd, yyyy")}</span>
                </div>
              )}
            </div>
            <Link href="/app/dashboard/profile">
              <Button variant="outline" className="w-full mt-4">
                View Full Profile
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Payment History */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Recent Payments
            </CardTitle>
            <CardDescription>Latest transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {recentPayments.length > 0 ? (
              <div className="space-y-3">
                {recentPayments.map((payment: any) => (
                  <div key={payment._id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium text-sm">{payment.description || "Payment"}</p>
                      <p className="text-xs text-muted-foreground">
                        {payment.created_at ? format(new Date(payment.created_at), "MMM dd, yyyy") : "N/A"}
                      </p>
                      {payment.transaction_id && (
                        <p className="text-xs text-muted-foreground">ID: {payment.transaction_id.slice(0, 10)}...</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                      <Badge variant="outline" className="text-xs">
                        {payment.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                <Link href="/app/dashboard/payments">
                  <Button variant="outline" className="w-full">
                    View All Payments
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No payments yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Announcements */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Association Announcements
            </CardTitle>
            <CardDescription>Latest updates</CardDescription>
          </CardHeader>
          <CardContent>
            {announcements.length > 0 ? (
              <div className="space-y-3">
                {announcements.slice(0, 3).map((announcement: any, index: number) => (
                  <div key={announcement._id || index} className="p-3 rounded-lg border">
                    <p className="font-medium text-sm">{announcement.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {announcement.description || announcement.content}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {announcement.created_at ? format(new Date(announcement.created_at), "MMM dd, yyyy") : "N/A"}
                    </p>
                  </div>
                ))}
                <Button variant="outline" className="w-full">
                  View All Announcements
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No announcements</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Installment Progress */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Installment Progress - {year}</CardTitle>
          <CardDescription>Monthly overview for this year</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Paid: {paidInstallmentsThisYear} / {totalInstallmentsThisYear || 12}
              </p>
              <p className="text-lg font-semibold">
                Progress: {totalInstallmentsThisYear ? Math.round((paidInstallmentsThisYear / totalInstallmentsThisYear) * 100) : 0}%
              </p>
            </div>
            <Link href="/app/dashboard/payments">
              <Button variant="outline" size="sm">
                View Details
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {monthArray.map((monthName, idx) => {
              const monthNum = idx + 1;
              const monthRecord = records.find(r => {
                const [rYear, rMonth] = r.period.split('-');
                return parseInt(rYear) === year && parseInt(rMonth) === monthNum;
              });
              let status = "Upcoming";
              let color = "bg-gray-200";
              
              if (monthRecord) {
                if (monthRecord.status === "PAID") {
                  status = "Paid";
                  color = "bg-green-500";
                } else {
                  const st = getInstallmentStatus(monthRecord, new Date());
                  if (st === "OVERDUE") {
                    status = "Overdue";
                    color = "bg-red-500";
                  } else if (st === "DUE" || st === "DUE_SOON") {
                    status = "Due";
                    color = "bg-orange-500";
                  } else {
                    status = "Upcoming";
                    color = "bg-blue-500";
                  }
                }
              } else if (monthNum < month) {
                status = "Not applicable";
                color = "bg-gray-300";
              } else {
                status = "Upcoming";
                color = "bg-gray-200";
              }
              
              return (
                <div key={monthName} className="text-center">
                  <div className={`w-full h-3 rounded-full ${color} mb-1`} title={status} />
                  <p className="text-xs text-muted-foreground">{monthName}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
