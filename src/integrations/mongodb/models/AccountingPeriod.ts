import { Schema, model, models } from "mongoose";

const accountingPeriodSchema = new Schema({
  year: { type: Number, required: true },
  month: { type: Number, required: true },
  is_locked: { type: Boolean, default: false },
  locked_at: { type: String },
  locked_by: { type: String },
  unlocked_at: { type: String },
  unlocked_by: { type: String },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

accountingPeriodSchema.index({ year: 1, month: 1 }, { unique: true });

export const AccountingPeriod = models.AccountingPeriod || model("AccountingPeriod", accountingPeriodSchema);
