import { injectEndpoint } from "@/store/baseApi";
import { AccountDoc } from "@/models/Account";

export interface AccountFilters {
  account_type?: string;
  is_active?: boolean;
  is_contra?: boolean;
  search?: string;
}

export const accountApi = injectEndpoint("accountApi", (builder) => ({
  getAccounts: builder.query<{ data: AccountDoc[]; count: number }, Partial<AccountFilters> | void>({
    query: (filters) => {
      const params = new URLSearchParams();
      if (filters) {
        const { account_type, is_active, is_contra, search } = filters;
        if (account_type) params.set("account_type", account_type);
        if (is_active !== undefined) params.set("is_active", String(is_active));
        if (is_contra !== undefined) params.set("is_contra", String(is_contra));
        if (search) params.set("search", search);
      }
      const queryString = params.toString();
      return {
        url: `/app/dashboard/accounting/api${queryString ? `?${queryString}` : ""}`,
        method: "GET",
      };
    },
    providesTags: ["Accounts"],
  }),
  createAccount: builder.mutation<AccountDoc, Omit<AccountDoc, "_id" | "created_at" | "updated_at">>({
    query: (body) => ({
      url: "/app/dashboard/accounting/api",
      method: "POST",
      body,
    }),
    invalidatesTags: ["Accounts"],
  }),
  updateAccount: builder.mutation<AccountDoc, { id: string; [key: string]: any }>({
    query: (body) => ({
      url: "/app/dashboard/accounting/api",
      method: "PATCH",
      body,
    }),
    invalidatesTags: (result, error, { id }) => [{ type: "Accounts", id }, "Accounts"],
  }),
  deleteAccount: builder.mutation<{ success: boolean }, { id: string }>({
    query: (body) => ({
      url: "/app/dashboard/accounting/api",
      method: "DELETE",
      body,
    }),
    invalidatesTags: ["Accounts"],
  }),
}));

export const {
  useGetAccountsQuery,
  useCreateAccountMutation,
  useUpdateAccountMutation,
  useDeleteAccountMutation,
} = accountApi;