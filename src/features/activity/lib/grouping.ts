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

/** Same soft palette used by the tables, so a status reads alike anywhere. */
const ACTIVITY_STATUS_CLASSES: Record<string, string> = {
  Ativo: "bg-green-100 text-green-800 border-green-200",
  Inativo: "bg-slate-100 text-slate-800 border-slate-200",
  Bloqueado: "bg-red-100 text-red-800 border-red-200",
  "Em Rota": "bg-blue-100 text-blue-800 border-blue-200",
  Completo: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Pendente: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Atualizado: "bg-indigo-100 text-indigo-800 border-indigo-200",
  Deletado: "bg-red-100 text-red-800 border-red-200",
  Criado: "bg-green-100 text-green-800 border-green-200",
  Entregue: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Insucesso: "bg-red-100 text-red-800 border-red-200",
  Cancelada: "bg-gray-100 text-gray-700 border-gray-200",
};

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

export { groupActivitiesByDay, ACTIVITY_STATUS_CLASSES };
export type { ActivityRow, ActivityGroup };
