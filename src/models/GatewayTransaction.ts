import { Document, Schema, model, models } from "mongoose";

interface IGatewayTransaction extends Document {
  transaction_id: string;
  member: string;
  amount: number;
  description: string;
  method: string;
  currency: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

const gatewayTransactionSchema = new Schema(
  {
    transaction_id: { type: String, required: true, unique: true },
    member: { type: Schema.Types.ObjectId, ref: "Member" },
    amount: { type: Number, required: true },
    description: { type: String },
    method: { type: String, default: "aamarpay" },
    currency: { type: String, default: "BDT" },
    status: { type: String, default: "success", enum: ["success", "fail", "cancel", "pending"] },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

export const GatewayTransaction =
  models.GatewayTransaction || model("GatewayTransaction", gatewayTransactionSchema);
export type GatewayTransactionDoc = IGatewayTransaction;
