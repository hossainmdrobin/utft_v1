import { z } from "zod";

export const journalLineSchema = z.object({
  account: z.string().min(1, "Account required"),
  description: z.string().optional(),
  debit: z.coerce.number().min(0).default(0),
  credit: z.coerce.number().min(0).default(0),
});

export const journalEntrySchema = z.object({
  date: z.string().min(1, "Date required"),
  reference: z.string().optional(),
  description: z.string().optional(),
  member: z.string().optional(),
  lines: z.array(journalLineSchema).min(2, "At least 2 lines required"),
});

export type JournalEntryFormValues = z.infer<typeof journalEntrySchema>;

export interface JournalEntryDialogProps {
  trigger?: React.ReactNode;
}
export type JournalEntryDialogPropsType = JournalEntryDialogProps;
