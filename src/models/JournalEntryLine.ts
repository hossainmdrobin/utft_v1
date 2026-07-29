import { Schema, model, models } from "mongoose";

const journalEntryLineSchema = new Schema({
  journal_entry_id: { type: String, required: true },
  account_id: { type: String, required: true },
  description: { type: String },
  debit: { type: Number, default: 0 },
  credit: { type: Number, default: 0 },
  member_id: { type: String },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

export const JournalEntryLine = models.JournalEntryLine || model("JournalEntryLine", journalEntryLineSchema);
