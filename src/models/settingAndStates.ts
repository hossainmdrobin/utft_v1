import { Setting, SettingDoc } from "@/integrations/mongodb/models/Setting";

export { Setting };
export type { SettingDoc };

export interface SettingInput {
  organization_name: string;
  organization_address?: string;
  organization_phone?: string;
  organization_email?: string;
  logo_url?: string;
  fiscal_year_start_month: number;
  fiscal_year_start_day: number;
  currency_symbol: string;
  currency_code: string;
  currency_decimal_places: number;
  currency_position: "before" | "after";
  default_contribution_amount: number;
  default_due_day: number;
  fine_enabled: boolean;
  next_member_serial: number;
  share_value: number;
  updated_by?: string;
}
