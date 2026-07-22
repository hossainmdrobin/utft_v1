import { Schema, model, models } from "mongoose";

const fineTransactionSchema = new Schema({
  member_id: { type: String, required: true },
  fine_rule_id: { type: String },
  charge_id: { type: String },
  donation_id: { type: String },
  fine_amount: { type: Number, required: true },
  paid_amount: { type: Number, default: 0 },
  status: { type: String, default: "pending" },
  reason: { type: String },
  waive_reason: { type: String },
  waived_at: { type: String },
  waived_by: { type: String },
  payment_date: { type: String },
  applied_date: { type: String, required: true },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

export const FineTransaction = models.FineTransaction || model("FineTransaction", fineTransactionSchema);
