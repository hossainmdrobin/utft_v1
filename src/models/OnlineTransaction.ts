import { Document, Schema, model, models } from "mongoose";

interface IOnlineTransaction extends Document {
  transaction_id: string;
  amount: number;
  currency: string;
  description: string;
  cus_name: string;
  member: string;
  account: string;
  created_at?: string;
  updated_at?: string;
}

const onlineTransactionSchema = new Schema(
  {
    transaction_id: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    description: { type: String, required: true },
    cus_name: { type: String, required: true },
    member: { type: Schema.Types.ObjectId, ref: "Member", required: true },
    account: { type: Schema.Types.ObjectId, ref: "Account", required: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

export const OnlineTransaction =
  models.OnlineTransaction || model("OnlineTransaction", onlineTransactionSchema);
export type OnlineTransactionDoc = IOnlineTransaction;
