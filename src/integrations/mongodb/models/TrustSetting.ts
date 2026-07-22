import { Schema, model, models } from "mongoose";

const trustSettingSchema = new Schema({
  key: { type: String, required: true, unique: true },
  value: { type: Schema.Types.Mixed, required: true },
  updated_by: { type: String },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

export const TrustSetting = models.TrustSetting || model("TrustSetting", trustSettingSchema);
