import { injectEndpoint } from "@/store/baseApi";
import type { SettingDoc } from "@/models/settingAndStates";

export const settingApi = injectEndpoint("settingApi", (builder) => ({
  getSettings: builder.query<SettingDoc, void>({
    query: () => ({
      url: "/app/dashboard/setting/api",
      method: "GET",
    }),
  }),
  updateSettings: builder.mutation<SettingDoc, Record<string, any>>({
    query: (body) => ({
      url: "/app/dashboard/setting/api",
      method: "PATCH",
      body,
    }),
  }),
}));

export const {
  useGetSettingsQuery,
  useUpdateSettingsMutation,
} = settingApi;
