import { injectEndpoint } from "@/store/baseApi";

export type Installment = {
    _id?: string,
    month: number,
    year: number,
    day?: number,
    description?: string,
    amount: number,
    status?: string,
    payment_status?: string,
    member?: any,
    created_by?: any,
    transaction_id?: string,
    paid_at?: string,
    method?: string,
    created_at?: string,
    updated_at?: string,
    [key: string]: any
}
export type ManualInstallmentReq = {
    member: string,
    data: Installment[]
}
export type GetInstallmentsByMemberIdReq = {
    id: string,
    limit?: number,
    page?: number
}
export type ActionOnInstallmentReq = {
    id: string;
    status?: string;
    payment_status?: string;
    paid_at?: string;
    memberId?: string;
    [key: string]: any;
}
export const manualInstallmentApi = injectEndpoint("installmentApi", (builder) => ({
    createManualInstallment: builder.mutation<any, ManualInstallmentReq>({
        query: (body) => ({
            url: "/api/installments/manual",
            method: "POST",
            body,
        }),
        invalidatesTags: (result, error, arg) => [
            { type: "INSTALLMENT", id: arg.member },
            "INSTALLMENT",
            "JournalEntries",
            "Accounts",
        ],
    }),
    getInstallmentsByMemberId: builder.query<Installment[], GetInstallmentsByMemberIdReq>({
        query: ({ id }) => ({
            url: `/api/installments/${id}`,
            method: "POST",
        }),
        providesTags: (result, error, arg) => [
            { type: "INSTALLMENT", id: arg.id },
            "INSTALLMENT"
        ]
    }),
    actionOnInstallment: builder.mutation<any, ActionOnInstallmentReq>({
        // INSTALLMENT ID , STATUS / PAYLOAD
        query: ({ id, memberId, ...body }) => ({
            url: `/api/installments/manual/${id}`,
            method: "POST",
            body: {
                status: "paid",
                payment_status: "paid",
                paid_at: new Date().toISOString(),
                ...body,
            }
        }),
        invalidatesTags: (result, error, arg) => [
            { type: "INSTALLMENT", id: arg.id },
            ...(arg.memberId ? [{ type: "INSTALLMENT" as const, id: arg.memberId }] : []),
            "INSTALLMENT",
            "JournalEntries",
            "Accounts",
        ],
    })
}));

export const {
    useCreateManualInstallmentMutation,
    useGetInstallmentsByMemberIdQuery,
    useActionOnInstallmentMutation
} = manualInstallmentApi;
