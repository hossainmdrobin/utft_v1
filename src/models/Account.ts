import { Schema, model, models, Document } from "mongoose";

export type AccountType = "asset" | "liability" | "equity" | "income" | "expense";

export interface IAccount extends Document {
  code?: string;
  name: string;
  type: AccountType;
  parentAccount?: Schema.Types.ObjectId;
  balance: number;
  description?: string;
  isActive: boolean;
}

const accountSchema = new Schema<IAccount>({
  code: { type: String, unique: true, sparse: true },
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ["asset", "liability", "equity", "income", "expense"],
    required: true,
  },
  parentAccount: { type: Schema.Types.ObjectId, ref: "Account", default: null },
  balance: { type: Number, default: 0 },
  description: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const Account = models.Account || model<IAccount>("Account", accountSchema);
export type AccountDoc = IAccount;
