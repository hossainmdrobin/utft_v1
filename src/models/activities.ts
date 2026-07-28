import { Schema, model, models, Document } from "mongoose";

interface IActivity extends Document {
  table_name: string;
  record_id: string;
  action: string;
  action_type?: string;
  description?: string;
  old_data?: Schema.Types.Mixed;
  new_data?: Schema.Types.Mixed;
  changed_by?: string;
  changed_at?: string;
  deleted_by?: string
  deleted_at?: string;
  is_deleted?: boolean;
  created_at?: string;
  updated_at?: string;
}

const activitySchema = new Schema(
  {
    table_name: { type: String, required: true },
    record_id: { type: String, required: true },
    action: { type: String, required: true },
    action_type: { type: String },
    description: { type: String },
    old_data: { type: Schema.Types.Mixed },
    new_data: { type: Schema.Types.Mixed },
    changed_by: { type: Schema.Types.ObjectId, ref:'Member' },
    changed_at: { type: String, required: true },
    deleted_by: { type: Schema.Types.ObjectId ,ref:'Member'},
    deleted_at: { type: String },
    is_deleted: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

export const Activity = models.Activity || model("Activity", activitySchema);
export type ActivityDoc = IActivity;
