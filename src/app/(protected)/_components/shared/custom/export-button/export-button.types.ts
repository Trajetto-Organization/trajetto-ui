type ExportFormat = "csv" | "excel";

interface ExportActionResponse {
  success?: boolean;
  message?: string;
  base64Data?: string;
  filename?: string;
  totalRecords?: number;
  mimeType?: string;
  fileSize?: number;
}

interface ExportButtonProps {
  className?: string;
  hasData?: boolean;
  exportAction: (
    search?: string,
    format?: ExportFormat,
  ) => Promise<ExportActionResponse>;
  entityName?: string;
}

export type { ExportButtonProps, ExportFormat, ExportActionResponse };
