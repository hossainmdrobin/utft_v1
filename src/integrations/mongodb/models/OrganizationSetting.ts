import { Schema, model, models } from "mongoose";

const organizationSettingSchema = new Schema({
  key: { type: String, required: true, unique: true },
  value: { type: Schema.Types.Mixed, required: true },
  description: { type: String },
  updated_by: { type: String },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

export const OrganizationSetting = models.OrganizationSetting || model("OrganizationSetting", organizationSettingSchema);
