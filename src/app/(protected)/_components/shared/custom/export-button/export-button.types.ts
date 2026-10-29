import type { ExportRequest } from "@/lib/export-download";

type ExportFormat = "csv" | "excel";

interface ExportButtonProps {
  className?: string;
  hasData?: boolean;
  /**
   * The export for the table's search and a format, as a relay request
   * (src/lib/export-requests.ts). The page binds the rest: facets, company.
   */
  exportRequest: (search?: string, format?: ExportFormat) => ExportRequest;
  entityName?: string;
  writePermission?: boolean;
}

export type { ExportButtonProps, ExportFormat };
