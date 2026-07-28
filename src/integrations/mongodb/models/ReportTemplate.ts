import { Schema, model, models } from "mongoose";

const reportTemplateSchema = new Schema({
  name: { type: String, required: true, unique: true },
  config: { type: Schema.Types.Mixed, required: true },
  description: { type: String },
  created_by: { type: String },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

export const ReportTemplate = models.ReportTemplate || model("ReportTemplate", reportTemplateSchema);
