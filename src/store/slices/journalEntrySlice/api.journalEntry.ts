import { injectEndpoint } from "@/store/baseApi";
import { JournalEntryDoc } from "@/models/JournalEntry";
import { JournalEntryLineDoc } from "@/models/JournalEntryLine";

export interface JournalEntryFilters {
  dateFrom?: string;
  dateTo?: string;
  order?: "asc" | "desc";
  member_id?: string;
  status?: string;
}

export interface JournalEntryLineFilters {
  dateFrom?: string;
  dateTo?: string;
  order?: "asc" | "desc";
  account_id?: string;
  entry_id?: string;
  member_id?: string;
}

export const journalEntryApi = injectEndpoint("journalEntryApi", (builder) => ({
  // Fetch journal entries with optional date filtering and ordering
  getJournalEntries: builder.query<{ data: JournalEntryDoc[]; count: number }, Partial<JournalEntryFilters> | void>({
    query: (filters) => {
      const params = new URLSearchParams();
      if (filters) {
        const { dateFrom, dateTo, order, member_id, status } = filters;
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);
        if (order) params.set("order", order);
        if (member_id) params.set("member_id", member_id);
        if (status) params.set("status", status);
      }
      const queryString = params.toString();
      return {
        url: `/app/dashboard/accounting/api/journalEntry${queryString ? `?${queryString}` : ""}`,
        method: "GET",
      };
    },
    providesTags: ["JournalEntries"],
  }),
  getEntryById: builder.query<JournalEntryDoc, { id: string }>({
    query: ({ id }) => ({
      url: `/app/dashboard/accounting/api/journalEntry/${id}`,
      method: "GET",
    }),
    providesTags: ["JournalEntries"],
  }),

  // Fetch journal entry lines with optional date filtering, ordering, and account_id filter
  getJournalEntryLines: builder.query<{ data: JournalEntryLineDoc[]; count: number }, Partial<JournalEntryLineFilters> | void>({
    query: (filters) => {
      const params = new URLSearchParams();
      params.set("type", "lines");
      if (filters) {
        const { dateFrom, dateTo, order, account_id, entry_id, member_id } = filters;
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);
        if (order) params.set("order", order);
        if (account_id) params.set("account_id", account_id);
        if (entry_id) params.set("entry_id", entry_id);
        if (member_id) params.set("member_id", member_id);
      }
      const queryString = params.toString();
      return {
        url: `/app/dashboard/accounting/api/journalEntry?${queryString}`,
        method: "GET",
      };
    },
    providesTags: ["JournalEntryLines"],
  }),

  // Create a journal entry with optional lines array
  createJournalEntry: builder.mutation<JournalEntryDoc, any>({
    query: (body) => ({
      url: "/app/dashboard/accounting/api/journalEntry",
      method: "POST",
      body,
    }),
    invalidatesTags: ["JournalEntries", "JournalEntryLines"],
  }),

  // Create a single journal entry line
  createJournalEntryLine: builder.mutation<JournalEntryLineDoc, any>({
    query: (body) => ({
      url: "/app/dashboard/accounting/api/journalEntry",
      method: "POST",
      body: { ...body, type: "line" },
    }),
    invalidatesTags: ["JournalEntryLines"],
  }),

  // Update a journal entry
  updateJournalEntry: builder.mutation<JournalEntryDoc, { id: string; [key: string]: any }>({
    query: (body) => ({
      url: "/app/dashboard/accounting/api/journalEntry",
      method: "PATCH",
      body,
    }),
    invalidatesTags: ["JournalEntries"],
  }),

  // Update a journal entry line
  updateJournalEntryLine: builder.mutation<JournalEntryLineDoc, { id: string; [key: string]: any }>({
    query: (body) => ({
      url: "/app/dashboard/accounting/api/journalEntry",
      method: "PATCH",
      body: { ...body, type: "line" },
    }),
    invalidatesTags: ["JournalEntryLines"],
  }),

  // Delete a journal entry (also removes its child lines)
  deleteJournalEntry: builder.mutation<{ success: boolean }, { id: string }>({
    query: (body) => ({
      url: "/app/dashboard/accounting/api/journalEntry",
      method: "DELETE",
      body,
    }),
    invalidatesTags: ["JournalEntries", "JournalEntryLines"],
  }),

  // Delete a journal entry line
  deleteJournalEntryLine: builder.mutation<{ success: boolean }, { id: string }>({
    query: (body) => ({
      url: "/app/dashboard/accounting/api/journalEntry",
      method: "DELETE",
      body: { ...body, type: "line" },
    }),
    invalidatesTags: ["JournalEntryLines"],
  }),
}));

export const {
  useGetJournalEntriesQuery,
  useGetJournalEntryLinesQuery,
  useGetEntryByIdQuery,
  useCreateJournalEntryMutation,
  useCreateJournalEntryLineMutation,
  useUpdateJournalEntryMutation,
  useUpdateJournalEntryLineMutation,
  useDeleteJournalEntryMutation,
  useDeleteJournalEntryLineMutation,
} = journalEntryApi;
