import { Schema, model, models, Document } from "mongoose";

interface IJournalEntryLine extends Document {
    status: "failed" | "succeed"

}

const journalEntryLineSchema = new Schema({
    status: { type: String, enum: ["failed", "succeed"] },
    month: { type: Number },
    year: { type: Number }

}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

export const JournalEntryLine = models.JournalEntryLine || model("JournalEntryLine", journalEntryLineSchema);
export type JournalEntryLineDoc = IJournalEntryLine;
