import { injectEndpoint } from "@/store/baseApi";

type MemberFilters = {
  stage?: string;
  joinDateFrom?: string;
  joinDateTo?: string;
  user_id?: string;
  role?: string;
  member_type?: string;
  search?: string;
};

export const memberApi = injectEndpoint("memberApi", (builder) => ({
  getMembers: builder.query<any, Partial<MemberFilters> | void>({
    query: (filters) => {
      const params = new URLSearchParams();
      if (filters) {
        const { stage, joinDateFrom, joinDateTo, user_id, role, member_type, search } = filters;
        if (stage) params.set("stage", stage);
        if (joinDateFrom) params.set("joinDateFrom", joinDateFrom);
        if (joinDateTo) params.set("joinDateTo", joinDateTo);
        if (user_id) params.set("user_id", user_id);
        if (role) params.set("role", role);
        if (member_type) params.set("member_type", member_type);
        if (search) params.set("search", search);
      }
      const queryString = params.toString();
      return {
        url: `/app/dashboard/members/api${queryString ? `?${queryString}` : ""}`,
        method: "GET",
      };
    },
    providesTags: ["Members"],
  }),
  createMember: builder.mutation<any, { user_id: string, password: string, member_type: string, share_quantity: number }>({
    query: (body) => ({
      url: "/app/dashboard/members/api",
      method: "POST",
      body,
    }),
    invalidatesTags: ["Members"],
  }),
  getMemberById: builder.query<any, string>({
    query: (id) => ({
      url: `/app/dashboard/members/api/${id}`,
      method: "GET",
    }),
    providesTags: (result, error, id) => [{ type: "Members", id }],
  }),
  updateMember: builder.mutation<any, { id: string;[key: string]: any }>({
    query: (body) => ({
      url: "/app/dashboard/members/api",
      method: "PATCH",
      body,
    }),
    invalidatesTags: (result, error, { id }) => [{ type: "Members", id }, "Members"],
  }),
}));

export const {
  useGetMembersQuery,
  useGetMemberByIdQuery,
  useUpdateMemberMutation,
  useCreateMemberMutation
} = memberApi;
