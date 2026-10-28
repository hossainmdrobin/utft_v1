import { injectEndpoint } from "@/store/baseApi";
import { JournalEntryDoc } from "@/models/JournalEntry";

export interface JournalEntryFilters {
  dateFrom?: string;
  dateTo?: string;
  order?: "asc" | "desc";
  member?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const journalEntryApi = injectEndpoint("journalEntryApi", (builder) => ({
  // Fetch journal entries with optional date filtering, pagination, and ordering
  getJournalEntries: builder.query<{ data: JournalEntryDoc[]; count: number }, Partial<JournalEntryFilters> | void>({
    query: (filters) => {
      const params = new URLSearchParams();
      if (filters) {
        const { dateFrom, dateTo, order, member, status, search, page, limit } = filters;
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);
        if (order) params.set("order", order);
        if (member) params.set("member", member);
        if (status) params.set("status", status);
        if (search) params.set("search", search);
        if (page !== undefined) params.set("page", String(page));
        if (limit !== undefined) params.set("limit", String(limit));
      }
      const queryString = params.toString();
      return {
        url: `/api/accounting/transactions${queryString ? `?${queryString}` : ""}`,
        method: "GET",
      };
    },
    providesTags: ["JournalEntries"],
  }),
  getEntryById: builder.query<JournalEntryDoc, { id: string }>({
    query: ({ id }) => ({
      url: `/api/accounting/transactions/${id}`,
      method: "GET",
    }),
    providesTags: ["JournalEntries"],
  }),

  // Create a journal entry. Validates balanced debits/credits and updates account balances.
  createJournalEntry: builder.mutation<JournalEntryDoc, any>({
    query: (body) => ({
      url: "/api/accounting/transactions",
      method: "POST",
      body,
    }),
    invalidatesTags: ["JournalEntries", "Accounts"],
  }),

  // Update a journal entry (id + entry fields)
  updateJournalEntry: builder.mutation<JournalEntryDoc, { id: string; [key: string]: any }>({
    query: (body) => {
      const { id, ...rest } = body;
      return {
        url: `/api/accounting/transactions/${id}`,
        method: "PATCH",
        body: rest,
      };
    },
    invalidatesTags: ["JournalEntries", "Accounts"],
  }),

  // Delete a journal entry
  deleteJournalEntry: builder.mutation<{ success: boolean }, { id: string }>({
    query: (body) => {
      const { id } = body;
      return {
        url: `/api/accounting/transactions/${id}`,
        method: "DELETE",
        body,
      };
    },
    invalidatesTags: ["JournalEntries", "Accounts"],
  }),
}));

export const {
  useGetJournalEntriesQuery,
  useGetEntryByIdQuery,
  useCreateJournalEntryMutation,
  useUpdateJournalEntryMutation,
  useDeleteJournalEntryMutation,
} = journalEntryApi;
