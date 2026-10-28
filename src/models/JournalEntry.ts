import { Schema, model, models, Document } from "mongoose";

export type JournalEntryStatus = "draft" | "posted" | "void";

interface IJournalEntryLine {
  account: Schema.Types.ObjectId;
  description?: string;
  debit: number;
  credit: number;
}

export interface IJournalEntry extends Document {
  date: Date;
  reference?: string;
  member?: Schema.Types.ObjectId;
  description: string;
  lines: IJournalEntryLine[];
  status: JournalEntryStatus;
  created_by:Schema.Types.ObjectId;
  actioned_by:Schema.Types.ObjectId;
}

const journalEntryLineSchema = new Schema<IJournalEntryLine>({
  account: { type: Schema.Types.ObjectId, ref: "Account", required: true },
  description: { type: String },
  debit: { type: Number, default: 0 },
  credit: { type: Number, default: 0 },
});

const journalEntrySchema = new Schema<IJournalEntry>({
  actioned_by:{type:Schema.Types.ObjectId, ref:"Member" },
  created_by:{type:Schema.Types.ObjectId, ref:"Member" },
  date: { type: Date, required: true },
  reference: { type: String },
  member: { type: Schema.Types.ObjectId, ref: "Member" },
  description: { type: String, required: true },
  lines: [journalEntryLineSchema],
  status: { type: String, enum: ["draft", "posted", "void"], default: "posted" },
}, { timestamps: true });

export const JournalEntry = models.JournalEntry || model<IJournalEntry>("JournalEntry", journalEntrySchema);
export type JournalEntryDoc = IJournalEntry;
