"use client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FinancialReports } from "@/components/accounting/FinancialReports";
import { ContributionReports } from "@/components/reports/ContributionReports";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, DollarSign } from "lucide-react";

export default function Reports() {
  return (
    <>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Reports</h2>
          <p className="text-muted-foreground mt-1">
            Generate and view comprehensive financial reports
          </p>
        </div>

        <Tabs defaultValue="financial" className="space-y-4">
          <TabsList>
            <TabsTrigger value="financial" className="gap-2">
              <FileText className="h-4 w-4" />
              Financial Reports
            </TabsTrigger>
            <TabsTrigger value="contributions" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Contribution Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="financial">
            <FinancialReports />
          </TabsContent>

          <TabsContent value="contributions">
            <ContributionReports />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

