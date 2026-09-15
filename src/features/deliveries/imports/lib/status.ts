import type { ImportData } from "@/actions/import/list-imports";

interface ImportStatusMeta {
  label: string;
  className: string;
}

/**
 * IN_PROGRESS is a real state, not a transient nobody sees.
 *
 * The upload record is written before the first row so everything it creates
 * carries its id from birth — which means a process that died halfway leaves
 * an upload sitting here, visibly open, with rows the undo can still find.
 * Showing it as "Concluída" would be the one lie that matters on this screen.
 */
const IMPORT_STATUS_META: Record<ImportData["status"], ImportStatusMeta> = {
  IN_PROGRESS: {
    label: "Em andamento",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  COMPLETED: {
    label: "Concluída",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  REVERSED: {
    label: "Estornada",
    className: "bg-gray-100 text-gray-500 border-gray-200",
  },
};

const IMPORT_SOURCE_LABEL: Record<ImportData["source"], string> = {
  SPREADSHEET: "Planilha",
  NFE_XML: "XML da NF-e",
};

/** Only a finished upload that has not been undone can be undone. */
function canReverse(record: ImportData): boolean {
  return record.status === "COMPLETED";
}

export { IMPORT_SOURCE_LABEL, IMPORT_STATUS_META, canReverse };
export type { ImportStatusMeta };
