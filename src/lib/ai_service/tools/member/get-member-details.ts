import { z } from "zod";
import { tool } from "@langchain/core/tools";
import type { RunnableConfig } from "@langchain/core/runnables";
import { connectDB } from "@/integrations/mongodb/connection";
import { Member } from "@/models/member";
import {
  extractAuthContext,
  isAuthorized,
  SENSITIVE_MEMBER_FIELDS,
  type ToolAuthContext,
} from "./types";

const schema = z.object({
  member_id: z.string().describe("MongoDB ObjectId (24 hex chars), user_id, form_no, or serial number of the member."),
});

export const getMemberDetailsTool = tool(
  async (input, config?: Partial<RunnableConfig>) => {
    const ctx: ToolAuthContext = extractAuthContext(config);
    if (!isAuthorized(ctx.role)) {
      return { error: "Access denied. Administrative privileges (admin, president, director, accountant, auditor) are required." };
    }

    await connectDB();

    const id = input.member_id.trim();

    const filter: Record<string, unknown> = {};
    if (/^[a-f\d]{24}$/i.test(id)) {
      filter._id = id;
    } else {
      const orClauses: Record<string, unknown>[] = [
        { user_id: id },
        { form_no: id },
      ];
      const serialNum = Number(id);
      if (!Number.isNaN(serialNum)) {
        orClauses.push({ serial: serialNum });
      }
      filter.$or = orClauses;
    }

    const member = await Member.findOne(filter)
      .populate("createdBy", "full_name user_id role _id")
      .select(`-${SENSITIVE_MEMBER_FIELDS.join(" -")}`)
      .lean();

    if (!member) {
      return { error: `Member not found: ${id}` };
    }

    return { data: member };
  },
  {
    name: "get_member_details",
    description: "Retrieve the complete profile of one specific member. Accepts a MongoDB ObjectId, user_id, form_no, or serial number. Returns basic info, contact info, membership details, registration info, approval status, and current stage. Excludes password and other sensitive authentication fields. Returns a clear not-found error if the member does not exist.",
    schema,
  },
);
