export interface DhakaDate {
  day: number;
  month: number;
  year: number;
}

export function getCurrentDhakaDate(date = new Date()): DhakaDate {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);

  const getPart = (type: "year" | "month" | "day") =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    day: getPart("day"),
    month: getPart("month"),
    year: getPart("year"),
  };
}

export const monthArray = ["Jan", "Feb", "March", "April","May", "June","July", "Aug", "Sep","Oct","Nov","Dec"]