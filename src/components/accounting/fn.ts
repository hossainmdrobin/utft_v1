import { startOfMonth, endOfMonth, subMonths } from "date-fns";

export const getDateLimit = (period: string, customStartDate?: Date, customEndDate?: Date) => {
    const now = new Date();
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    switch (period) {
        case "this_month":
            startDate = startOfMonth(now);
            endDate = endOfMonth(now);
            break;
        case "last_month":
            startDate = startOfMonth(subMonths(now, 1));
            endDate = endOfMonth(subMonths(now, 1));
            break;
        case "last_3_months":
            startDate = startOfMonth(subMonths(now, 2));
            endDate = endOfMonth(now);
            break;
        case "last_6_months":
            startDate = startOfMonth(subMonths(now, 5));
            endDate = endOfMonth(now);
            break;
        case "this_year":
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31);
            break;
        case "custom":
            startDate = customStartDate;
            endDate = customEndDate;
            break;
    }

    return { dateFrom: startDate, dateTo: endDate };
}
