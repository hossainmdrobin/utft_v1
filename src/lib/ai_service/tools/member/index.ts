import { searchMembersTool } from "./search-members";
import { getMemberDetailsTool } from "./get-member-details";
import { getMemberListTool } from "./get-member-list";
import { getMemberFinancialOverviewTool } from "./get-member-financial-overview";
import { getMemberActivitySummaryTool } from "./get-member-activity-summary";
import { getMemberCountSummaryTool } from "./get-member-count-summary";
import type { ToolAuthContext, ToolResult } from "./types";
import { AUTHORIZED_ROLES, DEFAULT_LIMIT, MAX_LIMIT } from "./types";

export {
  searchMembersTool,
  getMemberDetailsTool,
  getMemberListTool,
  getMemberFinancialOverviewTool,
  getMemberActivitySummaryTool,
  getMemberCountSummaryTool,
};

export type { ToolAuthContext, ToolResult };
export { AUTHORIZED_ROLES, DEFAULT_LIMIT, MAX_LIMIT };

export const memberTools = [
  searchMembersTool,
  getMemberDetailsTool,
  getMemberListTool,
  getMemberFinancialOverviewTool,
  getMemberActivitySummaryTool,
  getMemberCountSummaryTool,
];
