import { Member } from "./Member";
import { Account } from "@/models/Account";
import { JournalEntry } from "../../../models/JournalEntry";
import { MonthlyDonation } from "./MonthlyDonation";
import { MemberCharge } from "./MemberCharge";
import { FineRule } from "./FineRule";
import { FineTransaction } from "./FineTransaction";
import { ShareReceivable } from "./ShareReceivable";
import { ShareTransaction } from "./ShareTransaction";
import { AuditLog } from "./AuditLog";
import { ContributionSetting } from "./ContributionSetting";
import { OrganizationSetting } from "./OrganizationSetting";
import { TrustSetting } from "./TrustSetting";
import { ReportTemplate } from "./ReportTemplate";
import { UserRole } from "./UserRole";
import { AccountingPeriod } from "./AccountingPeriod";
import { Setting } from "./Setting";

export const models = {
  Member,
  Account,
  JournalEntry,
  MonthlyDonation,
  MemberCharge,
  FineRule,
  fine_rules: FineRule,
  FineTransaction,
  ShareReceivable,
  ShareTransaction,
  AuditLog,
  audit_logs: AuditLog,
  ContributionSetting,
  OrganizationSetting,
  TrustSetting,
  ReportTemplate,
  UserRole,
  user_roles: UserRole,
  AccountingPeriod,
  Setting,
};
