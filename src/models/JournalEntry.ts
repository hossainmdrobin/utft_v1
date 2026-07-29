import { Schema, model, models, Document } from "mongoose";

interface IJournalEntry extends Document {
  entry_number: string;
  entry_date: string;
  description?: string;
  member_id?: string;
  reference?: string;
  status: string;
  total_debit: number;
  total_credit: number;
  posted_at?: string;
  posted_by?: string;
  is_locked: boolean;
  locked_at?: string;
  locked_by?: string;
  created_by?: string;
}

const journalEntrySchema = new Schema({
  entry_number: { type: String, required: true },
  entry_date: { type: String, required: true },
  description: { type: String },
  member_id: { type: String },
  reference: { type: String },
  status: { type: String, default: "draft" },
  total_debit: { type: Number, default: 0 },
  total_credit: { type: Number, default: 0 },
  posted_at: { type: String },
  posted_by: { type: String },
  is_locked: { type: Boolean, default: false },
  locked_at: { type: String },
  locked_by: { type: String },
  created_by: { type: String },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

export const JournalEntry = models.JournalEntry || model("JournalEntry", journalEntrySchema);
export type JournalEntryDoc = IJournalEntry;
