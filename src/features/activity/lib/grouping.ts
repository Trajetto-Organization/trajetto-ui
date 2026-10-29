interface ActivityRow {
  id: string;
  type: string;
  action: string;
  description: string;
  status?: string | null;
  /** Shape the API sends: author and company travel nested. */
  user?: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  } | null;
  business?: { corporate_reason?: string | null } | null;
  tenantName?: string | null;
  created_at: string | Date;
}

interface ActivityGroup {
  key: string;
  label: string;
  items: ActivityRow[];
  formatTime: (value: string | Date) => string;
}

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});

const dayFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const formatTime = (value: string | Date): string =>
  timeFormatter.format(new Date(value));

/** Local calendar day, so grouping matches what the reader sees on a clock. */
const dayKey = (value: string | Date): string => {
  const date = new Date(value);

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

/**
 * Turns a flat list into "Hoje / Ontem / 18 de agosto de 2026" sections.
 * The API already returns newest first, so insertion order is preserved.
 */
function groupActivitiesByDay(activities: ActivityRow[]): ActivityGroup[] {
  const today = dayKey(new Date());

  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);

  const yesterday = dayKey(yesterdayDate);
  const groups = new Map<string, ActivityRow[]>();

  for (const activity of activities) {
    const key = dayKey(activity.created_at);
    const bucket = groups.get(key);

    if (bucket) {
      bucket.push(activity);
    } else {
      groups.set(key, [activity]);
    }
  }

  return Array.from(groups.entries()).map(([key, items]) => {
    let label = dayFormatter.format(new Date(items[0].created_at));

    if (key === today) label = "Hoje";
    if (key === yesterday) label = "Ontem";

    return { key, label, items, formatTime };
  });
}

export { groupActivitiesByDay };
export type { ActivityRow, ActivityGroup };
