import { injectEndpoint } from "@/store/baseApi";

export interface AuditLogEntry {
  _id: string;
  table_name: string;
  record_id: string;
  action: string;
  action_type?: string;
  description?: string;
  old_data?: unknown;
  new_data?: unknown;
  changed_by?: string;
  changed_at?: string;
  deleted_by?: string;
  deleted_at?: string;
  is_deleted?: boolean;
}

export const auditLogApi = injectEndpoint("auditLogApi", (builder) => ({
  getAuditLogs: builder.query<AuditLogEntry[], void>({
    query: () => ({
      url: "/app/dashboard/activity-log/api",
      method: "GET",
    }),
    transformResponse: (response: { data?: AuditLogEntry[] }) => response?.data ?? [],
    providesTags: ["AuditLogs"],
  }),
  deleteAuditLogs: builder.mutation<{ success: boolean }, { ids: string[] }>({
    query: (body) => ({
      url: "/app/dashboard/activity-log/api",
      method: "POST",
      body,
    }),
    invalidatesTags: ["AuditLogs"],
  }),
}));

export const {
  useGetAuditLogsQuery,
  useDeleteAuditLogsMutation,
} = auditLogApi;
