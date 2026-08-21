import { Schema, model, models, Document } from "mongoose";

interface ISetting extends Document {
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
  fine_per_share:boolean;
  amount:number;
  next_member_serial: number;
  share_value: number;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
}

const settingSchema = new Schema(
  {
    organization_address: { type: String, default: "" },
    organization_phone: { type: String, default: "" },
    organization_email: { type: String, default: "" },
    logo_url: { type: String, default: "" },
    fiscal_year_start_month: { type: Number, required: true, min: 1, max: 12, default: 1 },
    fiscal_year_start_day: { type: Number, required: true, min: 1, max: 31, default: 1 },
    currency_symbol: { type: String, required: true, default: "৳" },
    currency_code: { type: String, required: true, default: "BDT" },
    currency_decimal_places: { type: Number, required: true, min: 0, max: 4, default: 2 },
    currency_position: { type: String, enum: ["before", "after"], required: true, default: "before" },
    default_contribution_amount: { type: Number, required: true, default: 0 },
    default_due_day: { type: Number, required: true, min: 1, max: 28, default: 10 },
    fine_enabled: { type: Boolean, default: true },
    fine_per_share:{type:Boolean, default:false},
    amount:{type:Number, default:200},
    next_member_serial: { type: Number, required: true, default: 1 },
    share_value: { type: Number, required: true, default: 0 },
    updated_by: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

export const Setting = models.Setting || model("Setting", settingSchema);
export type SettingDoc = ISetting;
