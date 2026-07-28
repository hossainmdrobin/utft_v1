import { Schema, model, models } from "mongoose";

const auditLogSchema = new Schema({
  table_name: { type: String, required: true },
  record_id: { type: String, required: true },
  action: { type: String, required: true },
  action_type: { type: String },
  description: { type: String },
  old_data: { type: Schema.Types.Mixed },
  new_data: { type: Schema.Types.Mixed },
  changed_by: { type: String },
  changed_at: { type: String, required: true },
  deleted_by: { type: String },
  deleted_at: { type: String },
  is_deleted: { type: Boolean, default: false },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

export const AuditLog = models.AuditLog || model("AuditLog", auditLogSchema);
