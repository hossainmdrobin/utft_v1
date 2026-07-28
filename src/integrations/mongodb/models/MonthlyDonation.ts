import { Schema, model, models } from "mongoose";

const monthlyDonationSchema = new Schema({
  member_id: { type: String, required: true },
  amount: { type: Number, required: true },
  paid_amount: { type: Number, default: 0 },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  due_date: { type: String },
  payment_date: { type: String },
  status: { type: String, default: "pending" },
  notes: { type: String },
  created_by: { type: String },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

export const MonthlyDonation = models.MonthlyDonation || model("MonthlyDonation", monthlyDonationSchema);
