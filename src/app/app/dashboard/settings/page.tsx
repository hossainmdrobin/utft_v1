"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useGetSettingsQuery, useUpdateSettingsMutation } from "@/store/slices/settingSlice/api.setting";
import { OrganizationInfoSection } from "./components/OrganizationInfoSection";
import { FiscalYearSection } from "./components/FiscalYearSection";
import { CurrencySection } from "./components/CurrencySection";
import { SerialShareSection } from "./components/SerialShareSection";
import { ContributionSection } from "./components/ContributionSection";
import { FineSection } from "./components/FineSection";
import { useGetCurrentUserQuery } from "@/store/slices/authSlice/api.auth";

export default function SettingsPage() {
  const { data, isLoading: adminLoading } = useGetCurrentUserQuery();
  const { data: settings, isLoading } = useGetSettingsQuery();
  const [updateSettings, { isLoading: saving }] = useUpdateSettingsMutation();
  const isAdmin = ["admin", "president", "director"].includes(data?.data?.role);
console.log(settings, "settings", isLoading, adminLoading, data, isAdmin);
  const handleUpdate = async (patch: Record<string, any>) => {
    try {
      await updateSettings(patch).unwrap();
    } catch (error) {
      console.error("Failed to update settings:", error);
    }
  };

  if (isLoading || adminLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Settings</h2>
        <p className="text-muted-foreground mt-1">
          Manage application-wide configuration
        </p>
      </div>

      <div className="grid gap-6">
        <OrganizationInfoSection
          settings={settings?.data}
          onUpdate={handleUpdate}
          isAdmin={isAdmin}
          isSaving={saving}
        />
        <FiscalYearSection
          settings={settings?.data}
          onUpdate={handleUpdate}
          isAdmin={isAdmin}
          isSaving={saving}
        />
        <CurrencySection
          settings={settings?.data}
          onUpdate={handleUpdate}
          isAdmin={isAdmin}
          isSaving={saving}
        />
        <SerialShareSection
          settings={settings?.data}
          onUpdate={handleUpdate}
          isAdmin={isAdmin}
          isSaving={saving}
        />
        <ContributionSection
          settings={settings?.data}
          onUpdate={handleUpdate}
          isAdmin={isAdmin}
          isSaving={saving}
        />
        <FineSection
          settings={settings?.data}
          onUpdate={handleUpdate}
          isAdmin={isAdmin}
          isSaving={saving}
        />
      </div>
    </div>
  );
}
