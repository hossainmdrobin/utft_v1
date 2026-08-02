export type JournalEntry = {
  id: string;
  entry_number: string;
  entry_date: string;
  reference: string | null;
  description: string | null;
  status: string;
  total_debit: number;
  total_credit: number;
  created_at: string;
  member: { full_name: string; beneficiary_id: string } | null;
};

export type JournalLine = {
  id: string;
  description: string | null;
  debit: number;
  credit: number;
  account: { code: string; name: string };
};

export type DateRangeValue =
  | "all"
  | "this_month"
  | "last_month"
  | "last_3_months"
  | "last_6_months"
  | "this_year"
  | "custom";
