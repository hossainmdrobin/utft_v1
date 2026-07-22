import { Schema, model, models } from "mongoose";

const fineRuleSchema = new Schema({
  name: { type: String, required: true },
  fine_type: { type: String, required: true },
  fine_value: { type: Number, required: true },
  grace_period_days: { type: Number, required: true },
  max_fine_amount: { type: Number },
  is_cumulative: { type: Boolean, default: false },
  cumulative_frequency: { type: String },
  is_active: { type: Boolean, default: true },
  created_by: { type: String },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

export const FineRule = models.FineRule || model("FineRule", fineRuleSchema);
