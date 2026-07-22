import { Schema, model, models } from "mongoose";

const memberSchema = new Schema({
  full_name: { type: String, required: true },
  father_name: { type: String },
  mother_name: { type: String },
  date_of_birth: { type: String },
  gender: { type: String, enum: ["male", "female", "other"] },
  profession: { type: String },
  nationality: { type: String },
  religion: { type: String },
  blood_group: { type: String },
  education: { type: String },
  present_address: { type: String },
  permanent_address: { type: String },
  nid: { type: String },
  mobile: { type: String },
  email: { type: String },
  member_type: { type: String, enum: ["founding", "general"], required: true },
  share_quantity: { type: Number, default: 0 },
  form_no: { type: String },
  beneficiary_id: { type: String },
  photo_url: { type: String },
  status: { type: String, enum: ["pending", "active", "inactive", "deceased"], default: "pending" },
  approved_at: { type: String },
  deceased_at: { type: String },
  user_id: { type: String },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

export const Member = models.Member || model("Member", memberSchema);
