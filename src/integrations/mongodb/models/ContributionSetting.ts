import { Schema, model, models } from "mongoose";

const contributionSettingSchema = new Schema({
  member_id: { type: String, unique: true, sparse: true },
  default_contribution_amount: { type: Number, required: true },
  default_due_day: { type: Number, required: true },
  is_active: { type: Boolean, default: true },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

export const ContributionSetting = models.ContributionSetting || model("ContributionSetting", contributionSettingSchema);
