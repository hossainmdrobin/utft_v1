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
  createConversation: builder.mutation<ChatDoc, { prompt?: string; message?: string; title?: string }>({
    query: (body) => ({
      url: "/api/chat",
      method: "POST",
      body,
    }),
    invalidatesTags: ["Chat"],
  }),
  getMessageByChatId: builder.query<any, {id:string}>({
      query: ({id})=>({
        url:`/api/chat/${id}`
      })
  })
}));

export const {
  useGetConversationsQuery,
  useCreateConversationMutation,
  useGetMessageByChatIdQuery
} = chatApi;