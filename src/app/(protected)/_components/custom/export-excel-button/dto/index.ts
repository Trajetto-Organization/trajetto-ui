interface ExportExcelButtonProps {
  className?: string;
  hasData?: boolean;
  exportAction: (search?: string) => Promise<{
    success?: boolean;
    message?: string;
    base64Data?: string;
    filename?: string;
    totalRecords?: number;
  }>;
  entityName?: string;
  buttonText?: string;
}

export type { ExportExcelButtonProps };
