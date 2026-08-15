import { Schema, model, models, Document } from "mongoose";
import { JournalEntryLineDoc } from "./JournalEntryLine";
import { MemberDoc } from "./member";

interface IJournalEntry extends Document {
  lines?: string[] | JournalEntryLineDoc[];
  entry_number?: string;
  entry_date?: string;
  description?: string;
  member_id?: string | MemberDoc;
  reference?: string;
  status: string;
  total_debit: number;
  total_credit: number;
  posted_at?: string;
  posted_by?: string;
  is_locked: boolean;
  locked_at?: string;
  locked_by?: string;
  created_by?: string | MemberDoc;
  approved_by?: string | MemberDoc;
}

const journalEntrySchema = new Schema({
  lines: [{ type: Schema.Types.ObjectId, ref: "JournalEntryLine" }],
  entry_number: { type: String, required: false },
  entry_date: { type: String, required: true,default: new Date().toISOString() },
  description: { type: String },
  member_id: { type: Schema.Types.ObjectId, ref: "Member" },
  reference: { type: String },
  status: { type: String, default: "draft" },
  total_debit: { type: Number, default: 0 },
  total_credit: { type: Number, default: 0 },
  posted_at: { type: String },
  posted_by: { type: String },
  is_locked: { type: Boolean, default: false },
  locked_at: { type: String },
  locked_by: { type: String },
  created_by: { type: Schema.Types.ObjectId, ref: "Member" },
  approved_by: { type: Schema.Types.ObjectId, ref: "Member" },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

export const JournalEntry = models.JournalEntry || model("JournalEntry", journalEntrySchema);
export type JournalEntryDoc = IJournalEntry;
