import { z } from "zod";
import { tool } from "@langchain/core/tools";
import type { RunnableConfig } from "@langchain/core/runnables";
import { connectDB } from "@/integrations/mongodb/connection";
import { Member } from "@/models/member";
import { MonthlyDonation } from "@/integrations/mongodb/models/MonthlyDonation";
import { MemberCharge } from "@/integrations/mongodb/models/MemberCharge";
import { FineTransaction } from "@/integrations/mongodb/models/FineTransaction";
import { ShareReceivable } from "@/integrations/mongodb/models/ShareReceivable";
import { ShareTransaction } from "@/integrations/mongodb/models/ShareTransaction";
import { Installment } from "@/models/Installment";
import {
  extractAuthContext,
  isAuthorized,
  SENSITIVE_MEMBER_FIELDS,
  type ToolAuthContext,
} from "./types";

const schema = z.object({
  member_id: z.string().describe("MongoDB ObjectId (24 hex chars), user_id, form_no, or serial number of the member."),
});

function resolveMemberIdFilter(memberIdStr: string): Record<string, unknown> {
  if (/^[a-f\d]{24}$/i.test(memberIdStr)) {
    return { _id: memberIdStr };
  }
  return {
    $or: [
      { user_id: memberIdStr },
      { form_no: memberIdStr },
    ],
  };
}

export const getMemberActivitySummaryTool = tool(
  async (input, config?: Partial<RunnableConfig>) => {
    const ctx: ToolAuthContext = extractAuthContext(config);
    if (!isAuthorized(ctx.role)) {
      return { error: "Access denied. Administrative privileges (admin, president, director, accountant, auditor) are required." };
    }

    await connectDB();

    const id = input.member_id.trim();
    const memberFilter = resolveMemberIdFilter(id);

    const member = await Member.findOne(memberFilter)
      .select(`-${SENSITIVE_MEMBER_FIELDS.join(" -")}`)
      .lean();

    if (!member) {
      return { error: `Member not found: ${id}` };
    }

    const memberIdStr = String(member._id);

    const [
      donationStats,
      chargeStats,
      fineStats,
      shareReceivableStats,
      shareTransactionStats,
      installmentStats,
    ] = await Promise.all([
      MonthlyDonation.aggregate([
        { $match: { member_id: memberIdStr } },
        { $group: { _id: null, count: { $sum: 1 }, totalAmount: { $sum: "$amount" }, totalPaid: { $sum: "$paid_amount" } } },
      ]),
      MemberCharge.aggregate([
        { $match: { member_id: memberIdStr } },
        { $group: { _id: null, count: { $sum: 1 }, totalAmount: { $sum: "$amount" }, totalPaid: { $sum: "$paid_amount" } } },
      ]),
      FineTransaction.aggregate([
        { $match: { member_id: memberIdStr } },
        { $group: { _id: null, count: { $sum: 1 }, totalAmount: { $sum: "$fine_amount" }, totalPaid: { $sum: "$paid_amount" } } },
      ]),
      ShareReceivable.aggregate([
        { $match: { member_id: memberIdStr } },
        { $group: { _id: null, count: { $sum: 1 }, totalAmount: { $sum: "$total_amount" }, totalPaid: { $sum: "$paid_amount" } } },
      ]),
      ShareTransaction.aggregate([
        {
          $match: {
            $or: [
              { member_id: memberIdStr },
              { transfer_from_member_id: memberIdStr },
              { transfer_to_member_id: memberIdStr },
            ],
          },
        },
        { $group: { _id: null, count: { $sum: 1 }, totalAmount: { $sum: "$amount" } } },
      ]),
      Installment.aggregate([
        { $match: { member: member._id } },
        { $group: { _id: null, count: { $sum: 1 }, totalAmount: { $sum: "$amount" } } },
      ]),
    ]);

    const firstOrZero = (arr: Array<{ count?: number; totalAmount?: number; totalPaid?: number }>): { count: number; totalAmount: number; totalPaid: number } => {
      const row = arr[0];
      return {
        count: row?.count ?? 0,
        totalAmount: Number(row?.totalAmount ?? 0),
        totalPaid: Number(row?.totalPaid ?? 0),
      };
    };

    const donations = firstOrZero(donationStats);
    const charges = firstOrZero(chargeStats);
    const fines = firstOrZero(fineStats);
    const shareReceivables = firstOrZero(shareReceivableStats);
    const shareTransactions = firstOrZero(shareTransactionStats);
    const installments = firstOrZero(installmentStats);

    return {
      data: {
        member: {
          id: String(member._id),
          user_id: member.user_id,
          full_name: member.full_name,
          stage: member.stage,
          role: member.role,
          form_no: member.form_no,
          serial: member.serial,
          mobile: member.mobile,
          email: member.email,
          created_at: member.created_at,
          updated_at: member.updated_at,
        },
        summary: {
          registration: {
            created_at: member.created_at,
            stage: member.stage,
            created_by: member.createdBy ? (typeof member.createdBy === "object" ? String(member.createdBy._id) : String(member.createdBy)) : null,
          },
          payment_activity: {
            installments: {
              count: installments.count,
              total_amount: installments.totalAmount,
            },
          },
          donation_activity: {
            monthly_donations: {
              count: donations.count,
              total_amount: donations.totalAmount,
              total_paid: donations.totalPaid,
            },
          },
          fine_activity: {
            fine_transactions: {
              count: fines.count,
              total_amount: fines.totalAmount,
              total_paid: fines.totalPaid,
            },
          },
          share_activity: {
            share_receivables: {
              count: shareReceivables.count,
              total_amount: shareReceivables.totalAmount,
              total_paid: shareReceivables.totalPaid,
            },
            share_transactions: {
              count: shareTransactions.count,
              total_amount: shareTransactions.totalAmount,
            },
          },
        },
      },
    };
  },
  {
    name: "get_member_activity_summary",
    description: "Retrieve a compact summary of a member's available organizational activity. Includes registration info, approval stage, and counts/totals for payment activity (installments), donation activity (monthly donations), fine activity, and share activity (receivables and transactions). Does not return entire transaction collections. Use when the user wants a high-level overview of a member's organizational activity.",
    schema,
  },
);
