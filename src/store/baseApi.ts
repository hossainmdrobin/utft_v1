import { createApi, fetchBaseQuery, type BaseQueryFn, type FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import type { RootState } from "./index";

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: "/",
    prepareHeaders: (headers, { getState }) => {
      const state = getState() as { auth?: { token?: string } };
      const token = state.auth?.token || (typeof window !== "undefined" ? localStorage.getItem("access_token") : null);
      if (token) {
        headers.set("authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ["Members"],
  endpoints: () => ({}),
});

export type BaseQuery = BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError>;

export interface FetchArgs {
  url: string;
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export const injectEndpoint = (
  name: string,
  endpoints: Parameters<typeof baseApi.injectEndpoints>[0]["endpoints"]
) => {
  return baseApi.injectEndpoints({
    endpoints,
    overrideExisting: false,
  }) as any;
};
