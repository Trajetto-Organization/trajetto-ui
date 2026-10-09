import { formatContentDate } from "@/lib/content/format";

/** "5 de outubro de 2026": the design drops the day's leading zero. */
export function editorialDate(day: string): string {
  return formatContentDate(day).replace(/^0/, "");
}
