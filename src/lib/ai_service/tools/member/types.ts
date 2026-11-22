import type { RunnableConfig } from "@langchain/core/runnables";

export const AUTHORIZED_ROLES = ["admin", "president", "director", "accountant", "auditor"] as const;

export type AuthorizedRole = (typeof AUTHORIZED_ROLES)[number];

export type MemberStage = "initiated" | "pending" | "approved" | "rejected" | "deceased" | "inactive";

export interface ToolAuthContext {
  userId?: string;
  role?: string;
}

export interface PaginationParams {
  limit?: number;
  skip?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface ToolResult<T = unknown> {
  data?: T;
  error?: string;
  count?: number;
}

export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 50;

export const SENSITIVE_MEMBER_FIELDS = ["password"];

export function extractAuthContext(config?: Partial<RunnableConfig>): ToolAuthContext {
  const configurable = config?.configurable as Record<string, unknown> | undefined;
  return {
    userId: typeof configurable?.userId === "string" ? configurable.userId : undefined,
    role: typeof configurable?.role === "string" ? configurable.role : undefined,
  };
}

export function isAuthorized(role?: string): boolean {
  return role ? AUTHORIZED_ROLES.includes(role as AuthorizedRole) : false;
}

export function clampLimit(limit?: number): number {
  if (!limit || Number.isNaN(limit)) return DEFAULT_LIMIT;
  return Math.min(Math.max(1, Math.floor(limit)), MAX_LIMIT);
}

export function buildSort(sort_by?: string, sort_order?: "asc" | "desc"): Record<string, 1 | -1> | undefined {
  if (!sort_by) return undefined;
  return { [sort_by]: sort_order === "asc" ? 1 : -1 };
}

export function validateObjectId(id: string): boolean {
  return /^[a-f\d]{24}$/i.test(id);
}

export function memberProjection(excludeSensitive = true): string {
  if (excludeSensitive) {
    return `-${SENSITIVE_MEMBER_FIELDS.join(" -")}`;
  }
  return "";
}
