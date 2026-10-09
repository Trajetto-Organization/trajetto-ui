import React, { useState } from "react";
import { compressImage } from "@/lib/compress-image";

import { Upload, Image as ImageIcon, X } from "lucide-react";
import { useDropzone } from "react-dropzone";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PhotoUploadProps {
  fieldName: string;
  label: string;
  isRequired?: boolean;
  files: File[];
  onFilesChange: (files: File[]) => void;
  error?: string | null;
  pending: boolean;
  reason?: string;
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({
  fieldName,
  label,
  isRequired = false,
  files,
  onFilesChange,
  error,
  pending,
  reason,
}) => {
  const [validationError, setValidationError] = useState<string | null>(null);

  // File validation function
  const validateFile = (file: File): string | null => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      return "Tipo de arquivo não suportado. Use apenas JPEG, JPG, PNG ou WebP.";
    }

    if (file.size > maxSize) {
      return "O arquivo deve ter no máximo 5MB.";
    }

    return null;
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    multiple: true,
    disabled: pending,
    onDrop: async (acceptedFiles: File[], rejectedFiles) => {
      setValidationError(null); // Clear previous errors

      // Validate each accepted file
      const validFiles: File[] = [];
      let dropError: string | null = null;

      for (const file of acceptedFiles) {
        const error = validateFile(file);
        if (error) {
          dropError = error;
          break; // Stop at first error
        }
        validFiles.push(file);
      }

      // Handle rejected files from dropzone
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection.errors[0]?.code === "file-too-large") {
          dropError = "O arquivo deve ter no máximo 5MB.";
        } else if (rejection.errors[0]?.code === "file-invalid-type") {
          dropError =
            "Tipo de arquivo não suportado. Use apenas JPEG, JPG, PNG ou WebP.";
        } else {
          dropError = "Arquivo inválido.";
        }
      }

      if (dropError) {
        setValidationError(dropError);
        return;
      }

      if (validFiles.length > 0) {
        // Shrunk before they ever reach a FormData. A checklist can carry
        // twenty camera photos, and untouched that body is large enough to be
        // rejected before it leaves the Next server.
        const compressed = await Promise.all(validFiles.map(compressImage));
        onFilesChange([...files, ...compressed]);
      }
    },
  });

  const message = error || validationError;
  const errorId = `photo-${fieldName}-error`;

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    onFilesChange(newFiles);
  };

  return (
    <div className="mb-4">
      <div
        className="flex items-center
        justify-between mb-2"
      >
        {error || validationError ? (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="block text-sm font-medium
                  text-destructive mb-2 h-5 truncate"
                >
                  📷 {label}
                  {isRequired && (
                    <span className="text-red-600 dark:text-red-400"> *</span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent
                align="start"
                className="max-w-[300px] whitespace-normal break-words p-2"
              >
                {error || validationError}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <div
            className="text-sm font-medium
            text-gray-700 dark:text-gray-300"
          >
            📷 {label}
            {isRequired && (
              <span className="text-red-600 dark:text-red-400"> *</span>
            )}
          </div>
        )}
        {reason && (
          <span className="text-xs text-muted-foreground">{reason}</span>
        )}
      </div>

      {/* Files Display */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {files.map((file, index) => (
            <div key={index} className="relative">
              <div
                className="w-20 h-20 rounded-lg border-2 border-dashed 
                border-green-300 bg-green-50 dark:bg-green-950/20 
                p-2 flex flex-col items-center justify-center"
              >
                <ImageIcon className="h-6 w-6 text-green-600" />
                <p
                  className="text-xs font-medium text-green-800 
                  dark:text-green-200 truncate w-full text-center mt-1"
                >
                  {file.name.length > 8
                    ? file.name.substring(0, 8) + "..."
                    : file.name}
                </p>
                <p
                  className="text-xs text-green-600 
                  dark:text-green-400"
                >
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
                disabled={pending}
                className="absolute -top-2 -right-2 h-6 w-6 p-0 
                bg-red-500 hover:bg-red-600 rounded-full 
                flex items-center justify-center"
              >
                <X className="h-3 w-3 text-white" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Area: neutral until it is actually invalid (reward early,
          punish late); the label's asterisk is what says "required". */}
      {/* A named, focusable drop area that says when it is in error: the
          form's submit focuses the first invalid control, a missing photo
          included (decision 16.700). */}
      <div
        {...getRootProps({
          role: "button",
          "aria-label": `${label}: adicionar foto`,
          "aria-invalid": message ? true : undefined,
          "aria-describedby": message ? errorId : undefined,
        })}
        data-live-field={`photo:${fieldName}`}
        className={`border-2 border-dashed rounded-lg p-3 
        text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-blue-400 bg-blue-50 dark:bg-blue-950/20"
            : message
              ? "border-red-400 bg-red-50 dark:border-red-500/70 dark:bg-red-950/20"
              : "border-gray-300 dark:border-gray-600 hover:border-gray-400"
        } ${pending ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <input {...getInputProps()} aria-label={label} />
        <div className="flex flex-col items-center space-y-2">
          <Upload
            className={`h-6 w-6 ${
              isDragActive
                ? "text-blue-500"
                : message
                  ? "text-destructive"
                  : "text-muted-foreground"
            }`}
          />
          <div
            className={`text-sm ${
              message ? "text-destructive" : "text-gray-600 dark:text-gray-400"
            }`}
          >
            {isDragActive ? (
              <p>Solte as imagens aqui...</p>
            ) : (
              <>
                <p>
                  {files.length > 0 ? "Adicionar mais fotos" : "Adicionar foto"}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
      {message && (
        <p
          id={errorId}
          role="alert"
          className="mt-1.5 text-xs leading-4 text-destructive"
        >
          {message}
        </p>
      )}
    </div>
  );
};

export { PhotoUpload };
