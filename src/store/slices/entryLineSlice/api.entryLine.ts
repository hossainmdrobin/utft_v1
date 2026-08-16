import { injectEndpoint } from "@/store/baseApi";
import { JournalEntryLineDoc } from "@/models/JournalEntryLine";

export interface EntryLineFilters {
  dateFrom?: string;
  dateTo?: string;
  account_id?: string;
  member_id?: string;
}

export const entryLineApi = injectEndpoint("entryLineApi", (builder) => ({
  getEntryLines: builder.query<{ data: JournalEntryLineDoc[]; count: number; totalDebit: number; totalCredit: number }, Partial<EntryLineFilters> | void>({
    query: (filters) => {
      const params = new URLSearchParams();
      if (filters) {
        const { dateFrom, dateTo, account_id, member_id } = filters;
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);
        if (account_id) params.set("account_id", account_id);
        if (member_id) params.set("member_id", member_id);
      }
      const queryString = params.toString();
      return {
        url: `/app/dashboard/accounting/api/entry_line${queryString ? `?${queryString}` : ""}`,
        method: "GET",
      };
    },
    providesTags: ["JournalEntryLines"],
  }),
}));

export const { useGetEntryLinesQuery } = entryLineApi;
