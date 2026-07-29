"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShareReceivablesTab } from "@/components/shares/ShareReceivablesTab";
import { DonationsTable } from "./DonationsTable";
import { ChargesTable } from "./ChargesTable";
import { FinesTable } from "./FinesTable";

interface FinancialHistoryTabsProps {
  memberId: string;
  isAdmin: boolean;
  donations: any[];
  charges: any[];
  fines: any[];
  shareReceivablesCount: number;
  onPayClick: (type: "donation" | "charge" | "fine", record: any) => void;
  formatMonthYear: (year: number, month: number) => string;
}

export function FinancialHistoryTabs({
  memberId,
  isAdmin,
  donations,
  charges,
  fines,
  shareReceivablesCount,
  onPayClick,
  formatMonthYear,
}: FinancialHistoryTabsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial History</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="receivables" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="receivables">
              Share Receivables ({shareReceivablesCount})
            </TabsTrigger>
            <TabsTrigger value="shares">
              Contributions ({donations.length})
            </TabsTrigger>
            <TabsTrigger value="charges">
              Charges ({charges.length})
            </TabsTrigger>
            <TabsTrigger value="fines">
              Fines ({fines.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="receivables">
            {memberId && <ShareReceivablesTab memberId={memberId} isAdmin={isAdmin} />}
          </TabsContent>

          <TabsContent value="shares">
            <DonationsTable
              donations={donations}
              isAdmin={isAdmin}
              onPayClick={onPayClick}
              formatMonthYear={formatMonthYear}
            />
          </TabsContent>

          <TabsContent value="charges">
            <ChargesTable charges={charges} isAdmin={isAdmin} onPayClick={onPayClick} />
          </TabsContent>

          <TabsContent value="fines">
            <FinesTable fines={fines} isAdmin={isAdmin} onPayClick={onPayClick} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
