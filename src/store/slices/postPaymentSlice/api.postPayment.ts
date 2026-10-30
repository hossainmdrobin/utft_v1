import { injectEndpoint } from "@/store/baseApi";

export interface PostPaymentInput {
  sourceType: string;
  sourceId: string;
  paymentReference?: string;
  memberId: string;
  paymentDate: string | Date;
  amount: number;
  description: string;
  lines?: Array<{ accountId: string; debit: number; credit: number; description?: string }>;
}

export interface PostPaymentResult {
  journalEntry: any;
  isDuplicate: boolean;
}

export const postPaymentApi = injectEndpoint("postPaymentApi", (builder) => ({
  postPayment: builder.mutation<PostPaymentResult, PostPaymentInput>({
    query: (body) => ({
      url: "/app/dashboard/payments/api/post-payment",
      method: "POST",
      body,
    }),
    invalidatesTags: ["JournalEntries", "Accounts"],
  }),
}));

export const { usePostPaymentMutation } = postPaymentApi;
