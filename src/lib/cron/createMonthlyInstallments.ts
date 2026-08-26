import { Member } from "@/integrations/mongodb/models/Member";
import { Setting } from "@/integrations/mongodb/models/Setting";
import { Installment } from "@/models/Installment";
import { getCurrentDhakaDate } from "@/lib/date/dhaka";

export type MonthlyInstallmentResult =
  | { ran: false; reason: "not_due_day"; today: ReturnType<typeof getCurrentDhakaDate> }
  | { ran: true; created: number; month: number; year: number };

export async function createMonthlyInstallments(): Promise<MonthlyInstallmentResult> {
  const today = getCurrentDhakaDate();
  const setting = await Setting.findOne({}).sort({ created_at: 1 }).lean();

  if (!setting || setting.default_due_day !== today.day) {
    return { ran: false, reason: "not_due_day", today };
  }

  const members = await Member.find({}).select("_id").lean();
  const paidMemberIds = await Installment.distinct("member", {
    month: today.month,
    year: today.year,
  });
  const paidMemberIdSet = new Set(paidMemberIds.map(String));
  const unpaidMembers = members.filter((member) => !paidMemberIdSet.has(String(member._id)));

  if (unpaidMembers.length === 0) {
    return { ran: true, created: 0, month: today.month, year: today.year };
  }

  const result = await Installment.bulkWrite(
    unpaidMembers.map((member) => ({
      updateOne: {
        filter: { member: member._id, month: today.month, year: today.year },
        update: {
          $setOnInsert: {
            member: member._id,
            month: today.month,
            year: today.year,
            day: setting.default_due_day,
            status: "due",
            amount: setting.default_contribution_amount,
            currency: setting.currency_code,
            description: `Monthly installment for ${today.month}/${today.year}`,
            method: "scheduled",
          },
        },
        upsert: true,
      },
    })),
    { ordered: false },
  );

  return { ran: true, created: result.upsertedCount, month: today.month, year: today.year };
}