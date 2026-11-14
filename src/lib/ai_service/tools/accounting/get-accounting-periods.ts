import { z } from "zod";
import { tool } from "@langchain/core/tools";
import type { RunnableConfig } from "@langchain/core/runnables";
import { connectDB } from "@/integrations/mongodb/connection";
import { listAccountingPeriods } from "./service";
import {
  extractAuthContext,
  isAuthorized,
  AUTHORIZED_ROLES,
  clampLimit,
  buildSort,
  type ToolAuthContext,
} from "./types";

const schema = z.object({
  year: z.number().min(2000).max(2100).optional().describe("Filter by calendar year."),
  month: z.number().min(1).max(12).optional().describe("Filter by calendar month (1-12)."),
  status: z.enum(["open", "locked"]).optional().describe("Filter by period status (open = not locked, locked = closed)."),
  name: z.string().optional().describe("Filter by period name (YYYY-MM format)."),
  limit: z.number().min(1).max(50).default(10).describe("Maximum results. Default 10, max 50."),
  skip: z.number().min(0).default(0).describe("Number of results to skip."),
  sort_by: z.enum(["year", "month", "created_at", "updated_at"]).optional().describe("Sort field."),
  sort_order: z.enum(["asc", "desc"]).optional().describe("Sort direction."),
});

export const getAccountingPeriodsTool = tool(
  async (input, config?: Partial<RunnableConfig>) => {
    const ctx: ToolAuthContext = extractAuthContext(config);
    if (!isAuthorized(ctx.role)) {
      return {
        error: "Access denied. Administrative privileges (admin, president, director, accountant, auditor) are required.",
      };
    }

    await connectDB();

    const { year, month, status, name, limit, skip, sort_by, sort_order } = input;

    let yearFilter = year;
    let monthFilter = month;
    if (name) {
      const parts = name.trim().split("-");
      if (parts.length === 2) {
        const y = Number(parts[0]);
        const m = Number(parts[1]);
        if (!Number.isNaN(y)) yearFilter = y;
        if (!Number.isNaN(m)) monthFilter = m;
      }
    }

    const isLocked = status === "locked" ? true : status === "open" ? false : undefined;

    const result = await listAccountingPeriods({
      year: yearFilter,
      month: monthFilter,
      is_locked: isLocked,
      limit: clampLimit(limit),
      skip: skip ?? 0,
      sort_by,
      sort_order,
    });

    return {
      data: result.data.map((p) => ({
        id: p.id,
        year: p.year,
        month: p.month,
        name: `${p.year}-${String(p.month).padStart(2, "0")}`,
        status: p.status,
        is_locked: p.is_locked,
        locked_at: p.locked_at,
        locked_by: p.locked_by,
        unlocked_at: p.unlocked_at,
        unlocked_by: p.unlocked_by,
        created_at: p.created_at,
        updated_at: p.updated_at,
      })),
      count: result.count,
      limit: result.limit,
      skip: result.skip,
      hasMore: result.hasMore,
      note: "Read-only. This tool never opens, closes, or modifies an accounting period.",
    };
  },
  {
    name: "get_accounting_periods",
    description: "Retrieve accounting period information. Supports filtering by year, month/period name, and status (open/locked). Can find open periods or closed/locked periods. Returns period name, start/end year-month, status, and closing information. Read-only only; never opens, closes, or modifies periods.",
    schema,
  },
);
