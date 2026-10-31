import { injectEndpoint } from "@/store/baseApi";

type Installment = {
    _id?: string,
    month: number,
    year: number,
    description?: string,
    amount: number,
    status?: string,
    payment_status?: string,
    member?: any,
    created_by?: any,
    transaction_id?: string,
    paid_at?: string,
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
export const manualInstallmentApi = injectEndpoint("installmentApi", (builder) => ({
    createManualInstallment: builder.mutation<any, ManualInstallmentReq>({
        query: (body) => ({
            url: "/api/installments/manual",
            method: "POST",
            body,
        }),
        invalidatesTags: (result, error, arg) => [
            { type: "INSTALLMENT", id: arg.member },
            "INSTALLMENT"
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
    actionOnInstallment: builder.mutation<any, { id: string, status: string }>({
        // INSTALLMENT ID , STATUS
        query: ({ id, status }) => ({
            url: `/api/installments/manual/${id}`,
            method: "POST",
            body: { status }
        }),
        invalidatesTags: (result, error, arg) => [
            { type: "INSTALLMENT", id: arg.id },
            "INSTALLMENT"
        ],
    })
}));

export const {
    useCreateManualInstallmentMutation,
    useGetInstallmentsByMemberIdQuery,
    useActionOnInstallmentMutation
} = manualInstallmentApi;
