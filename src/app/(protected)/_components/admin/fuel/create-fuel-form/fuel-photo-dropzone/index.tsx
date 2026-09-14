import { useDropzone } from "react-dropzone";

import { Upload, Image as ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { compressImage } from "@/lib/compress-image";

interface FuelPhotoDropzoneProps {
  odometerFile: File | null;
  setOdometerFile: (file: File | null) => void;
  fileError: string | null;
  setFileError: (error: string | null) => void;
  serverError?: string[];
  pending: boolean;
}

function FuelPhotoDropzone({
  odometerFile,
  setOdometerFile,
  fileError,
  setFileError,
  serverError,
  pending,
}: FuelPhotoDropzoneProps) {
  const validateFile = (file: File): string | null => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type))
      return "Tipo de arquivo não suportado. Use apenas JPEG, JPG, PNG ou WebP.";

    if (file.size > maxSize) return "O arquivo deve ter no máximo 5MB.";
    return null;
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    maxSize: 5 * 1024 * 1024,
    maxFiles: 1,
    multiple: false,
    disabled: pending,
    onDrop: async (acceptedFiles: File[], rejectedFiles) => {
      setFileError(null);

      if (rejectedFiles.length > 0) {
        const code = rejectedFiles[0].errors[0]?.code;
        if (code === "file-too-large")
          setFileError("O arquivo deve ter no máximo 5MB.");
        else if (code === "file-invalid-type")
          setFileError(
            "Tipo de arquivo não suportado. Use apenas JPEG, JPG, PNG ou WebP.",
          );
        else setFileError("Arquivo inválido.");
        return;
      }

      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        const validationError = validateFile(file);

        if (validationError) {
          setFileError(validationError);
          setOdometerFile(null);
        } else {
          setFileError(null);
          setOdometerFile(await compressImage(file));
        }
      }
    },
  });

  const removeFile = () => {
    setOdometerFile(null);
    setFileError(null);
  };

  const currentError = fileError || serverError?.[0];

  return (
    <div className="col-span-1 md:col-span-2">
      {currentError ? (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="block text-sm font-medium text-red-500 
                mb-2 h-5 truncate cursor-default"
              >
                {currentError}
              </div>
            </TooltipTrigger>
            <TooltipContent
              align="start"
              className="max-w-[300px] whitespace-normal break-words p-2"
            >
              {currentError}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <div className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Foto do Odômetro <span className="text-red-500">*</span>
        </div>
      )}

      {!odometerFile ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
            ${isDragActive ? "border-blue-400 bg-blue-50 dark:bg-blue-950/20" : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"}
            ${pending ? "opacity-50 cursor-not-allowed" : ""}
            ${currentError ? "border-red-300 bg-red-50 dark:bg-red-950/20" : ""}`}
        >
          <input
            {...getInputProps()}
            name="odometer_photo"
            aria-label="Foto do Odômetro"
          />
          <div className="flex flex-col items-center space-y-2">
            <Upload
              className={`h-8 w-8 ${isDragActive ? "text-blue-500" : "text-gray-400"}`}
            />
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {isDragActive ? (
                <p>Solte a imagem aqui...</p>
              ) : (
                <>
                  <p>
                    <span className="font-medium">Clique para selecionar</span>{" "}
                    ou arraste a imagem
                  </p>
                  <p className="text-xs mt-1">
                    PNG, JPG, JPEG, WebP (máx. 5MB)
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div
          className="border-2 border-dashed border-green-300 
        bg-green-50 dark:bg-green-950/20 rounded-lg p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ImageIcon className="h-8 w-8 text-green-600" />
              <div>
                <p
                  className="text-sm font-medium 
                text-green-800 dark:text-green-200"
                >
                  {odometerFile.name}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {(odometerFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={removeFile}
              disabled={pending}
              className="text-red-600 hover:text-red-800 
              hover:bg-red-100 dark:hover:bg-red-950/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export { FuelPhotoDropzone };
