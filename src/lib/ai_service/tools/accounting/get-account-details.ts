import { z } from "zod";
import { tool } from "@langchain/core/tools";
import type { RunnableConfig } from "@langchain/core/runnables";
import { connectDB } from "@/integrations/mongodb/connection";
import { Account } from "@/models/Account";
import { computeAccountBalance } from "./service";
import {
  extractAuthContext,
  isAuthorized,
  AUTHORIZED_ROLES,
  type ToolAuthContext,
} from "./types";

const schema = z.object({
  account_id: z.string().optional().describe("MongoDB ObjectId (24 hex chars) of the account."),
  code: z.string().optional().describe("Account code (e.g. 1211)."),
  name: z.string().optional().describe("Exact account name (case-insensitive)."),
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const getAccountDetailsTool = tool(
  async (input, config?: Partial<RunnableConfig>) => {
    const ctx: ToolAuthContext = extractAuthContext(config);
    if (!isAuthorized(ctx.role)) {
      return {
        error: "Access denied. Administrative privileges (admin, president, director, accountant, auditor) are required.",
      };
    }

    await connectDB();

    const { account_id, code, name } = input;
    const filter: Record<string, unknown> = {};

    if (account_id) {
      if (!/^[a-f\d]{24}$/i.test(account_id)) {
        return { error: `Invalid account ID: ${account_id}` };
      }
      filter._id = account_id;
    } else if (code) {
      filter.code = code.trim();
    } else if (name) {
      filter.name = new RegExp(`^${escapeRegExp(name.trim())}$`, "i");
    } else {
      return { error: "Provide account_id, code, or name." };
    }

    const account = await Account.findOne(filter as any)
      .populate("parentAccount", "code name type")
      .lean();
    if (!account) {
      return { error: `Account not found.` };
    }

    const balance = await computeAccountBalance(String(account._id), {
      startDate: undefined,
      endDate: undefined,
      label: "lifetime",
      endInclusive: true,
      timezone: "Asia/Dhaka",
    });

    const parentAccount =
      account.parentAccount && typeof account.parentAccount === "object"
        ? {
            id: String((account.parentAccount as any)._id),
            code: (account.parentAccount as any).code ?? null,
            name: (account.parentAccount as any).name,
            type: (account.parentAccount as any).type,
          }
        : null;

    return {
      data: {
        account: {
          id: balance.account.id,
          code: balance.account.code,
          name: balance.account.name,
          type: balance.account.type,
          isActive: balance.account.isActive,
          description: balance.account.description,
          parentAccount,
        },
        storedBalance: balance.storedBalance,
        calculatedBalance: balance.calculatedBalance,
        openingBalance: balance.openingBalance,
        totalDebit: balance.totalDebit,
        totalCredit: balance.totalCredit,
        balanceNature: balance.balanceNature,
        note:
          "storedBalance is the materialized Account.balance field. calculatedBalance is derived from posted journal entries (lifetime, all dates). These are intentionally reported separately and are not interchangeable.",
      },
    };
  },
  {
    name: "get_account_details",
    description: "Retrieve complete details of one specific account by MongoDB ID, account code, or exact account name. Returns account information, type, the stored materialized balance, and the calculated balance derived from posted journal entries (lifetime). Stored and calculated balances are reported separately. Read-only.",
    schema,
  },
);
