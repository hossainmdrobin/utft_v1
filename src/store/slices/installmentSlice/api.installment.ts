import { injectEndpoint } from "@/store/baseApi";

type Installment = {
    _id?: string,
    month: number,
    year: number,
    description: string,
    amount: number,
    status: string
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
        invalidatesTags: ["INSTALLMENT"],
    }),
    getInstallmentsByMemberId: builder.query<Installment, GetInstallmentsByMemberIdReq>({
        query: ({ id, limit = 20, page = 1 }) => ({
            url: `/api/installments/${id}?limit=${limit}&page=${page}`
        }),
        providesTags:["INSTALLMENT"]
    })
}));

export const { useCreateManualInstallmentMutation, useGetInstallmentsByMemberIdQuery } = manualInstallmentApi;
