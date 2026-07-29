import { Schema, model, models, Document } from "mongoose";

interface IJournalEntryLine extends Document {
  journal_entry_id: string;
  account_id: string;
  description?: string;
  debit: number;
  credit: number;
  member_id?: string;
}

const journalEntryLineSchema = new Schema({
  journal_entry_id: { type: String, required: true },
  account_id: { type: String, required: true },
  description: { type: String },
  debit: { type: Number, default: 0 },
  credit: { type: Number, default: 0 },
  member_id: { type: String },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

export const JournalEntryLine = models.JournalEntryLine || model("JournalEntryLine", journalEntryLineSchema);
export type JournalEntryLineDoc = IJournalEntryLine;
