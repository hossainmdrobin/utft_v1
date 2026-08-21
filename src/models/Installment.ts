import { Document, Schema, model, models } from "mongoose";

interface IInstallment extends Document {
  transaction_id: string;
  amount: number;
  currency: string;
  description: string;
  cus_name: string;
  member: string;
  account: string;
  method:string;
  month:string;
  created_at?: string;
  updated_at?: string;
}

const installmentSchema = new Schema(
  {
    transaction_id: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    currency: { type: String ,default:'BDT'},
    description: { type: String, },
    cus_name: { type: String },
    month:{type:String},
    method: {type:String,default:'aamarpay' },
    member: { type: Schema.Types.ObjectId, ref: "Member" },
    account: { type: Schema.Types.ObjectId, ref: "Account" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

export const Installment =
  models.Installment || model("OnlineTransaction", installmentSchema);
export type InstallmentDoc = IInstallment;
