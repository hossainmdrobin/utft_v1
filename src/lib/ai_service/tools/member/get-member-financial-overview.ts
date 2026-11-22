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

export const getMemberFinancialOverviewTool = tool(
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

    const [donations, charges, fines, shareReceivables, shareTransactions, installments] = await Promise.all([
      MonthlyDonation.find({ member_id: memberIdStr }).lean().sort({ created_at: -1 }).limit(20),
      MemberCharge.find({ member_id: memberIdStr }).lean().sort({ created_at: -1 }).limit(20),
      FineTransaction.find({ member_id: memberIdStr }).lean().sort({ applied_date: -1 }).limit(20),
      ShareReceivable.find({ member_id: memberIdStr }).lean().sort({ created_at: -1 }).limit(20),
      ShareTransaction.find({
        $or: [
          { member_id: memberIdStr },
          { transfer_from_member_id: memberIdStr },
          { transfer_to_member_id: memberIdStr },
        ],
      }).lean().sort({ transaction_date: -1 }).limit(20),
      Installment.find({ member: member._id }).lean().sort({ created_at: -1 }).limit(20),
    ]);

    const financial: Record<string, unknown> = {
      monthly_donations: {
        source: "MonthlyDonation",
        count: donations.length,
        records: donations.map((d) => ({
          id: String(d._id),
          amount: d.amount,
          paid_amount: d.paid_amount,
          month: d.month,
          year: d.year,
          status: d.status,
          due_date: d.due_date,
          payment_date: d.payment_date,
          notes: d.notes,
          created_at: d.created_at,
        })),
      },
      member_charges: {
        source: "MemberCharge",
        count: charges.length,
        records: charges.map((c) => ({
          id: String(c._id),
          charge_type: c.charge_type,
          amount: c.amount,
          paid_amount: c.paid_amount,
          description: c.description,
          status: c.status,
          year: c.year,
          due_date: c.due_date,
          payment_date: c.payment_date,
          created_at: c.created_at,
        })),
      },
      fine_transactions: {
        source: "FineTransaction",
        count: fines.length,
        records: fines.map((f) => ({
          id: String(f._id),
          fine_amount: f.fine_amount,
          paid_amount: f.paid_amount,
          status: f.status,
          reason: f.reason,
          applied_date: f.applied_date,
          payment_date: f.payment_date,
          waive_reason: f.waive_reason,
          waived_by: f.waived_by,
          created_at: f.created_at,
        })),
      },
      share_receivables: {
        source: "ShareReceivable",
        count: shareReceivables.length,
        records: shareReceivables.map((s) => ({
          id: String(s._id),
          month: s.month,
          year: s.year,
          share_price: s.share_price,
          share_quantity: s.share_quantity,
          total_amount: s.total_amount,
          paid_amount: s.paid_amount,
          remaining_amount: s.remaining_amount,
          status: s.status,
          due_date: s.due_date,
          payment_date: s.payment_date,
          notes: s.notes,
          created_at: s.created_at,
        })),
      },
      share_transactions: {
        source: "ShareTransaction",
        count: shareTransactions.length,
        records: shareTransactions.map((t) => ({
          id: String(t._id),
          transaction_type: t.transaction_type,
          share_quantity: t.share_quantity,
          amount: t.amount,
          transaction_date: t.transaction_date,
          transfer_from_member_id: t.transfer_from_member_id,
          transfer_to_member_id: t.transfer_to_member_id,
          notes: t.notes,
          created_at: t.created_at,
        })),
      },
      installments: {
        source: "Installment",
        count: installments.length,
        records: installments.map((i) => ({
          id: String(i._id),
          amount: i.amount,
          payment_status: i.payment_status,
          status: i.status,
          month: i.month,
          year: i.year,
          transaction_id: i.transaction_id,
          method: i.method,
          created_at: i.created_at,
        })),
      },
    };

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
        },
        financial,
      },
    };
  },
  {
    name: "get_member_financial_overview",
    description: "Retrieve a member's existing financial overview from related financial models. Does not perform new accounting calculations. Queries monthly donations, member charges, fine transactions, share receivables, share transactions, and installments linked to the member by member_id. Returns available information with clear source labels. Use when the user wants to see a member's financial activity across donation, charge, fine, share, and installment records.",
    schema,
  },
);
