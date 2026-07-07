"use client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrganizationSettings } from "@/components/settings/OrganizationSettings";
import { ContributionSettings } from "@/components/settings/ContributionSettings";
import { PeriodLocking } from "@/components/accounting/PeriodLocking";
import { AuditLogs } from "@/components/accounting/AuditLogs";
import { Building2, Lock, History, DollarSign } from "lucide-react";

export default function Settings() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Settings</h2>
          <p className="text-muted-foreground mt-1">
            Configure your application settings
          </p>
        </div>

        <Tabs defaultValue="organization" className="space-y-4">
          <TabsList>
            <TabsTrigger value="organization" className="gap-2">
              <Building2 className="h-4 w-4" />
              Organization
            </TabsTrigger>
            <TabsTrigger value="contributions" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Contributions & Fines
            </TabsTrigger>
            <TabsTrigger value="locking" className="gap-2">
              <Lock className="h-4 w-4" />
              Period Locking
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
              <History className="h-4 w-4" />
              Audit Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="organization">
            <OrganizationSettings />
          </TabsContent>

          <TabsContent value="contributions">
            <ContributionSettings />
          </TabsContent>

          <TabsContent value="locking">
            <PeriodLocking />
          </TabsContent>

          <TabsContent value="logs">
            <AuditLogs />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

