import { Schema, model, models } from "mongoose";

const memberChargeSchema = new Schema({
  member_id: { type: String, required: true },
  charge_type: { type: String, required: true },
  amount: { type: Number, required: true },
  paid_amount: { type: Number, default: 0 },
  description: { type: String },
  due_date: { type: String },
  payment_date: { type: String },
  status: { type: String, default: "pending" },
  year: { type: Number, required: true },
  created_by: { type: String },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

export const MemberCharge = models.MemberCharge || model("MemberCharge", memberChargeSchema);
