"use client";

import { useDropzone } from "react-dropzone";
import { Image as ImageIcon, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FieldShell } from "@/components/shared/custom/field-shell";

import { compressImage } from "@/lib/compress-image";
import { cn } from "@/lib/utils";

const MAX_BYTES = 5 * 1024 * 1024;

const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

/** Why a picked file is refused, in the person's language; null when it is fine. */
function photoFileError(file: Pick<File, "type" | "size">): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return "Tipo de arquivo não suportado. Use apenas JPEG, JPG, PNG ou WebP.";
  }

  if (file.size > MAX_BYTES) return "O arquivo deve ter no máximo 5MB.";

  return null;
}

interface PhotoDropzoneProps {
  /** "Foto do odômetro *" on create, "(opcional)" when replacing one. */
  label: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  fileError: string | null;
  onFileError: (error: string | null) => void;
  serverError?: string[];
  disabled: boolean;
  /** Tells the person the pick replaces the stored photo (edit). */
  replacesCurrent?: boolean;
}

/**
 * The odometer photo field. The label stays and the error goes under the
 * box (decisions 3.3/3.4) — both copies used to REPLACE the label with a
 * one-line truncated error. The picked image is shrunk and stripped of
 * metadata before it leaves the browser: with direct-to-storage uploads
 * nothing on the server re-encodes it, so a camera JPEG would carry its GPS
 * coordinates into the bucket.
 */
const PhotoDropzone = ({
  label,
  file,
  onFileChange,
  fileError,
  onFileError,
  serverError,
  disabled,
  replacesCurrent = false,
}: PhotoDropzoneProps): JSX.Element => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    maxSize: MAX_BYTES,
    maxFiles: 1,
    multiple: false,
    disabled,
    onDrop: async (accepted: File[], rejected) => {
      onFileError(null);

      if (rejected.length > 0) {
        const code = rejected[0].errors[0]?.code;

        onFileError(
          code === "file-too-large"
            ? "O arquivo deve ter no máximo 5MB."
            : code === "file-invalid-type"
              ? "Tipo de arquivo não suportado. Use apenas JPEG, JPG, PNG ou WebP."
              : "Arquivo inválido.",
        );

        return;
      }

      const picked = accepted[0];

      if (!picked) return;

      const refusal = photoFileError(picked);

      if (refusal) {
        onFileError(refusal);
        onFileChange(null);
        return;
      }

      onFileChange(await compressImage(picked));
    },
  });

  const error = fileError ?? serverError?.[0] ?? null;

  return (
    <FieldShell label={label} htmlFor="odometer_photo" error={error}>
      {(control) =>
        !file ? (
          <div
            {...getRootProps()}
            // The input is hidden: the drop area carries the error wiring,
            // so a failed submit can focus it (live validation, 16.700).
            aria-invalid={control["aria-invalid"]}
            aria-describedby={control["aria-describedby"]}
            data-live-field="odometer_photo"
            className={cn(
              "cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors",
              isDragActive
                ? "border-blue-400 bg-blue-50 dark:bg-blue-950/20"
                : "border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500",
              disabled && "cursor-not-allowed opacity-50",
              control["aria-invalid"] &&
                "border-red-300 bg-red-50 dark:bg-red-950/20",
            )}
          >
            <input {...getInputProps()} id={control.id} name="odometer_photo" />

            <div className="flex flex-col items-center space-y-2">
              <Upload
                className={cn(
                  "h-8 w-8",
                  isDragActive ? "text-blue-500" : "text-muted-foreground",
                )}
              />

              <div className="text-sm text-gray-600 dark:text-gray-400">
                {isDragActive ? (
                  <p>Solte a imagem aqui...</p>
                ) : (
                  <>
                    <p>
                      <span className="font-medium">
                        Clique para selecionar
                      </span>{" "}
                      ou arraste a imagem
                    </p>
                    <p className="mt-1 text-xs">
                      PNG, JPG, JPEG, WebP (máx. 5MB)
                    </p>
                    {replacesCurrent && (
                      <p className="mt-1 text-xs text-orange-600">
                        Substituirá a imagem atual
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 rounded-lg border-2 border-dashed border-green-300 bg-green-50 p-4 dark:bg-green-950/20">
            <div className="flex min-w-0 items-center gap-3">
              <ImageIcon className="h-8 w-8 shrink-0 text-green-600" />

              <div className="min-w-0">
                <p
                  className="truncate text-sm font-medium text-green-800 dark:text-green-200"
                  title={file.name}
                >
                  {file.name}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                {replacesCurrent && (
                  <p className="text-xs text-orange-600 dark:text-orange-400">
                    Substituirá a imagem atual
                  </p>
                )}
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onFileChange(null);
                onFileError(null);
              }}
              disabled={disabled}
              aria-label="Remover foto"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )
      }
    </FieldShell>
  );
};

export { PhotoDropzone, photoFileError };
