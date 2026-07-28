import { Schema, model, models } from "mongoose";

const shareTransactionSchema = new Schema({
  member_id: { type: String, required: true },
  transaction_type: { type: String, required: true },
  share_quantity: { type: Number, required: true },
  amount: { type: Number, required: true },
  notes: { type: String },
  transaction_date: { type: String },
  transfer_from_member_id: { type: String },
  transfer_to_member_id: { type: String },
  created_by: { type: String },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

export const ShareTransaction = models.ShareTransaction || model("ShareTransaction", shareTransactionSchema);
