import { injectEndpoint } from "@/store/baseApi";

export const memberApi = injectEndpoint("memberApi", (builder) => ({
  getMembers: builder.query<any, void>({
    query: () => ({
      url: "/dashboard/members/api",
      method: "GET",
    }),
    providesTags: ["Members"],
  }),
  getMember: builder.query<any, string>({
    query: (id) => ({
      url: `/dashboard/members/api?id=${id}`,
      method: "GET",
    }),
    providesTags: (result, error, id) => [{ type: "Members", id }],
  }),
  updateMember: builder.mutation<any, { id: string; [key: string]: any }>({
    query: (body) => ({
      url: "/dashboard/members/api",
      method: "PATCH",
      body,
    }),
    invalidatesTags: (result, error, { id }) => [{ type: "Members", id }, "Members"],
  }),
}));

export const {
  useGetMembersQuery,
  useGetMemberQuery,
  useUpdateMemberMutation,
} = memberApi;
