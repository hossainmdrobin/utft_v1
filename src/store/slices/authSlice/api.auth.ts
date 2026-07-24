import { injectEndpoint } from "@/store/baseApi";

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  full_name: string;
}

export interface AuthResponse {
  data: {
    user: AuthUser;
  };
}

export interface VerifyCredentialsRequest {
  user_id: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export const authApi = injectEndpoint("authApi", (builder) => ({
  verifyCredentials: builder.mutation<AuthResponse, VerifyCredentialsRequest>({
    query: (body) => ({
      url: "/auth/api",
      method: "PATCH",
      body,
    }),
  }),
  login: builder.mutation<AuthResponse, LoginRequest>({
    query: (body) => ({
      url: "/auth/api",
      method: "POST",
      body,
    }),
  }),
}));

export const {
  useVerifyCredentialsMutation,
  useLoginMutation,
} = authApi;
