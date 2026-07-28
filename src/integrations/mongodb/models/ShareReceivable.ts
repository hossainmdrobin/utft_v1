import { Schema, model, models } from "mongoose";

const shareReceivableSchema = new Schema({
  member_id: { type: String, required: true },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  share_price: { type: Number, required: true },
  share_quantity: { type: Number, required: true },
  total_amount: { type: Number, required: true },
  paid_amount: { type: Number, default: 0 },
  remaining_amount: { type: Number },
  status: { type: String, default: "pending" },
  due_date: { type: String },
  payment_date: { type: String },
  notes: { type: String },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

export const ShareReceivable = models.ShareReceivable || model("ShareReceivable", shareReceivableSchema);
