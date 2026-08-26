import { injectEndpoint } from "@/store/baseApi";

export interface Installment {
	_id: string;
	transaction_id: string;
	amount: number;
	currency: string;
	description: string;
	cus_name: string;
	member: string;
	account: string;
	method: string;
	month?: number;
	year?: number;
	created_at?: string;
	updated_at?: string;
}

export interface GetInstallmentsParams {
	member?: string;
	method?: string;
	currency?: string;
	amount_min?: number;
	amount_max?: number;
	created_from?: string;
	created_to?: string;
	search?: string;
}

export interface GetInstallmentsResponse {
	data: Installment[];
	count: number;
}

export interface GatewayTransaction {
	_id: string;
	transaction_id: string;
	member: string;
	amount: number;
	description?: string;
	method: string;
	currency: string;
	status: string;
	created_at?: string;
	updated_at?: string;
}

export interface GetGatewayTransactionsResponse {
	data: GatewayTransaction[];
	count: number;
	total: number;
	page: number;
	limit: number;
}

export interface CreatePaymentRequest {
	amount: number;
	description: string;
	name: string;
	installments:[{year:number, month:number}]
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
	getInstallments: builder.query<GetInstallmentsResponse, GetInstallmentsParams | void>({
		query: (params) => {
			if (!params) return "/app/dashboard/payments/api";
			const searchParams = new URLSearchParams();
			if (params.member) searchParams.set("member", params.member);
			if (params.method) searchParams.set("method", params.method);
			if (params.currency) searchParams.set("currency", params.currency);
			if (params.amount_min !== undefined) searchParams.set("amount_min", String(params.amount_min));
			if (params.amount_max !== undefined) searchParams.set("amount_max", String(params.amount_max));
			if (params.created_from) searchParams.set("created_from", params.created_from);
			if (params.created_to) searchParams.set("created_to", params.created_to);
			if (params.search) searchParams.set("search", params.search);
			const qs = searchParams.toString();
			return `/app/dashboard/payments/api${qs ? `?${qs}` : ""}`;
		},
	}),
	getGatewayTransactions: builder.query<GetGatewayTransactionsResponse, { member: string }>({
		query: ({ member }) => `/api/aamarpay/transactions?member=${encodeURIComponent(member)}`,
	}),
}));

export const {
	useCreateAamarPayPaymentMutation,
	useGetInstallmentsQuery,
	useGetGatewayTransactionsQuery,
} = paymentApi;
