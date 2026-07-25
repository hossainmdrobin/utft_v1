import { useGetMembersQuery } from '@/store/slices/memberSlice/api.member';
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

export interface CurrentUserResponse {
  data: {
    member: any;
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
  updateAuthUser: builder.mutation<any, { user_id: string; data: any }>({
    query: (body) => ({
      url: "/auth/api",
      method: "PUT",
      body,
    }),
  }),
  getCurrentUser: builder.query<CurrentUserResponse, void>({
    query: () => ({
      url: "/auth/api",
      method: "GET",
    }),
  }),
}));

export const {
  useVerifyCredentialsMutation,
  useLoginMutation,
  useUpdateAuthUserMutation,
  useGetCurrentUserQuery
} = authApi;
