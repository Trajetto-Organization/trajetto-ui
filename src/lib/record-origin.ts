interface RecordOriginMeta {
  label: string;
  className: string;
}

/**
 * Visuals for the record origin badge (fuel/checklist tables): one color per
 * source so a manager can tell at a glance what came from the driver's app
 * and what was typed in the office.
 */
const RECORD_ORIGIN_META: Record<string, RecordOriginMeta> = {
  MOBILE_APP: {
    label: "App",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200 " +
      "dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
  },
  WEB_DASHBOARD: {
    label: "Web",
    className:
      "bg-sky-50 text-sky-700 border-sky-200 " +
      "dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800",
  },
};

/** Legacy rows without the field count as Web — that is where they were made. */
function getRecordOriginMeta(
  origin: string | null | undefined,
): RecordOriginMeta {
  return (
    RECORD_ORIGIN_META[origin ?? "WEB_DASHBOARD"] ??
    RECORD_ORIGIN_META.WEB_DASHBOARD
  );
}

/** Short pt-BR phrase for activity/descriptions. */
function formatRecordOrigin(origin: string | null | undefined): string {
  return origin === "MOBILE_APP" ? "Aplicativo" : "Web";
}

export { getRecordOriginMeta, formatRecordOrigin };
