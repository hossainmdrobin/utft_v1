import { ChatDoc } from "@/models/Chat";
import { injectEndpoint } from "@/store/baseApi";


export const chatApi = injectEndpoint("chatApi", (builder) => ({
  getConversations: builder.query<any, void>({
    query: () => ({
      url: "/api/chat",
      method: "GET",
    }),
    providesTags: ["Chat"],
  }),
  createConversation: builder.mutation<ChatDoc, { message:string }>({
    query: (body) => ({
      url: "/api/chat",
      method: "POST",
      body,
    }),
    invalidatesTags: ["Chat"],
  }),
}));

export const {
  useGetConversationsQuery,
  useCreateConversationMutation,
} = chatApi;