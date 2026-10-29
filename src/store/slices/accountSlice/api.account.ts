import { injectEndpoint } from "@/store/baseApi";
import { AccountDoc } from "@/models/Account";

export interface AccountFilters {
  type?: string;
  isActive?: boolean;
  search?: string;
  tree?: boolean;
}

export const accountApi = injectEndpoint("accountApi", (builder) => ({
  getAccounts: builder.query<{ data: AccountDoc[]; count: number }, Partial<AccountFilters> | void>({
    query: (filters) => {
      const params = new URLSearchParams();
      if (filters) {
        const { type, isActive, search, tree } = filters;
        if (type) params.set("type", type);
        if (isActive !== undefined) params.set("isActive", String(isActive));
        if (search) params.set("search", search);
        if (tree !== undefined) params.set("tree", String(tree));
      }
      const queryString = params.toString();
      return {
        url: `/api/accounting/accounts${queryString ? `?${queryString}` : ""}`,
        method: "GET",
      };
    },
    providesTags: ["Accounts"],
  }),
  createAccount: builder.mutation<AccountDoc, Omit<AccountDoc, "_id" | "createdAt" | "updatedAt">>({
    query: (body) => ({
      url: "/api/accounting/accounts",
      method: "POST",
      body,
    }),
    invalidatesTags: ["Accounts"],
  }),
  updateAccount: builder.mutation<AccountDoc, { id: string; [key: string]: any }>({
    query: (body) => {
      const { id, ...rest } = body;
      return {
        url: `/api/accounting/accounts/${id}`,
        method: "PATCH",
        body: rest,
      };
    },
    invalidatesTags: (result, error, { id }) => [{ type: "Accounts", id }, "Accounts"],
  }),
  deleteAccount: builder.mutation<{ success: boolean }, { id: string }>({
    query: (body) => {
      const { id } = body;
      return {
        url: `/api/accounting/accounts/${id}`,
        method: "DELETE",
        body,
      };
    },
    invalidatesTags: ["Accounts"],
  }),
}));

export const {
  useGetAccountsQuery,
  useCreateAccountMutation,
  useUpdateAccountMutation,
  useDeleteAccountMutation,
} = accountApi;
