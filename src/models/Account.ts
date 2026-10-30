import { Schema, model, models, Document, Types } from "mongoose";

export type AccountType = "asset" | "liability" | "equity" | "income" | "expense";

export interface IAccount extends Document {
  code?: string;
  name: string;
  type: AccountType;
  parentAccount?: Types.ObjectId | null;
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

accountSchema.statics.validateParent = async function (
  accountId: Types.ObjectId | string,
  parentId: Types.ObjectId | string | null | undefined,
) {
  if (!parentId) return;
  const accountIdStr = accountId.toString();
  const parentIdStr = parentId.toString();
  if (accountIdStr === parentIdStr) {
    throw new Error("Account cannot be its own parent");
  }
  let currentId: Types.ObjectId | string | null = parentId;
  const visited = new Set<string>();
  while (currentId) {
    const key = currentId.toString();
    if (visited.has(key)) break;
    visited.add(key);
    if (key === accountIdStr) {
      throw new Error("Circular parent reference detected");
    }
    const parent = await this.findById(currentId).lean();
    if (!parent) {
      throw new Error("Parent account not found");
    }
    currentId = (parent as any).parentAccount || null;
  }
};

accountSchema.pre("save", async function () {
  const account = this as IAccount & { _id: Types.ObjectId };
  await (this.constructor as unknown as { validateParent: (id: any, parentId: any) => Promise<void> }).validateParent(account._id, account.parentAccount ?? null);
});

export const Account = models.Account || model<IAccount>("Account", accountSchema);
export type AccountDoc = IAccount;
