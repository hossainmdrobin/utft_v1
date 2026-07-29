import { Schema, model, models, Document } from "mongoose";

interface IAccount extends Document {
  name: string;
  code: string;
  account_type: "asset" | "liability" | "equity" | "income" | "expense";
  description?: string;
  opening_balance: number;
  current_balance: number;
  is_active: boolean;
  is_contra: boolean;
  is_system: boolean;
  parent_account_id?: string;
  parent_id?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

const accountSchema = new Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  account_type: { type: String, enum: ["asset", "liability", "equity", "income", "expense"], required: true },
  description: { type: String },
  opening_balance: { type: Number, default: 0 },
  current_balance: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
  is_contra: { type: Boolean, default: false },
  is_system: { type: Boolean, default: false },
  parent_account_id: { type: String },
  parent_id: { type: String },
  created_by: { type: String },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

export const Account = models.Account || model("Account", accountSchema);
export type AccountDoc = IAccount;
