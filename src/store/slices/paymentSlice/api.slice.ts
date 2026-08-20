import { injectEndpoint } from "@/store/baseApi";

export interface CreatePaymentRequest {
	amount: string;
	description: string;
	name: string;
	email: string;
	phone: string;
}

export interface CreatePaymentResponse {
	paymentUrl: string;
	transactionId: string;
}

export const paymentApi = injectEndpoint("paymentApi", (builder) => ({
	createAamarPayPayment: builder.mutation<CreatePaymentResponse, CreatePaymentRequest>({
		query: (body) => ({
			url: "/api/aamarpay",
			method: "POST",
			body,
		}),
	}),
}));

export const { useCreateAamarPayPaymentMutation } = paymentApi;
