import { Schema, model, models, Document } from "mongoose";

interface IMonthlyInstallmentCornSchema extends Document {
    status: "failed" | "succeed"

}

const monthlyInstallmentCornSchema = new Schema({
    status: { type: String, enum: ["failed", "succeed"] },
    month: { type: Number },
    year: { type: Number }

}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

export const MonthlyInstallmentCornSchema = models.MonthlyInstallmentCornSchema || model("MonthlyInstallmentCornSchema", monthlyInstallmentCornSchema);
export type MonthlyInstallmentCornSchemaDoc = IMonthlyInstallmentCornSchema;