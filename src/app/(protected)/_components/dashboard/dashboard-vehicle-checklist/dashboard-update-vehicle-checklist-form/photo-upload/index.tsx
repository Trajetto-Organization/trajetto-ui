import { useState } from "react";
import Image from "next/image";

import { Upload, Image as ImageIcon, X, Eye } from "lucide-react";
import { useDropzone } from "react-dropzone";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  existingPhotos: string[];
  onFilesChange: (files: File[]) => void;
  onExistingPhotoRemove: (photoUrl: string) => void;
  error?: string | null;
  pending: boolean;
  reason?: string;
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({
  fieldName,
  label,
  isRequired = false,
  files,
  existingPhotos,
  onFilesChange,
  onExistingPhotoRemove,
  error,
  pending,
  reason,
}) => {
  const [validationError, setValidationError] = useState<string | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState<string | null>(null);

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
    onDrop: (acceptedFiles: File[], rejectedFiles) => {
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
        onFilesChange([...files, ...validFiles]);
      }
    },
  });

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    onFilesChange(newFiles);
  };

  const handleExistingPhotoRemove = (photoUrl: string) => {
    onExistingPhotoRemove(photoUrl);
  };

  const hasPhotos = existingPhotos.length > 0 || files.length > 0;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        {error || validationError ? (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="block text-sm font-medium
                  text-red-500 mb-2 h-5 truncate"
                >
                  📷 {label}
                  {isRequired && <span className="text-red-500"> *</span>}
                </div>
              </TooltipTrigger>
              <TooltipContent
                align="start"
                className="max-w-[300px]
                whitespace-normal break-words p-2"
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
            {isRequired && <span className="text-red-500"> *</span>}
          </div>
        )}
        {reason && <span className="text-xs text-gray-500">{reason}</span>}
      </div>

      {/* Existing Photos Display */}
      {existingPhotos.length > 0 && (
        <div className="mb-3">
          <div
            className="text-xs text-gray-600 
            dark:text-gray-400 mb-2"
          >
            Fotos existentes:
          </div>
          <div className="flex flex-wrap gap-2">
            {existingPhotos.map((photoUrl, index) => (
              <div key={`existing-${index}`} className="relative group">
                <div
                  className="w-20 h-20 rounded-lg border-2 border-dashed 
                  border-blue-300 bg-blue-50 dark:bg-blue-950/20 
                  p-2 flex flex-col items-center justify-center"
                >
                  <ImageIcon className="h-6 w-6 text-blue-600" />
                  <p
                    className="text-xs font-medium text-blue-800 
                    dark:text-blue-200 truncate w-full text-center mt-1"
                  >
                    Foto {index + 1}
                  </p>
                </div>

                {/* View button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setImageModalOpen(photoUrl)}
                  disabled={pending}
                  className="absolute -top-1 -left-1 h-6 w-6 p-0 bg-blue-500 
                  hover:bg-blue-600 rounded-full flex items-center justify-center 
                  opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Eye className="h-3 w-3 text-white" />
                </Button>

                {/* Remove button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleExistingPhotoRemove(photoUrl)}
                  disabled={pending}
                  className="absolute -top-1 -right-1 h-6 w-6 p-0 bg-red-500 
                  hover:bg-red-600 rounded-full flex items-center 
                  justify-center opacity-0 group-hover:opacity-100 
                  transition-opacity"
                >
                  <X className="h-3 w-3 text-white" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Files Display */}
      {files.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
            Novas fotos a serem adicionadas:
          </div>
          <div className="flex flex-wrap gap-2">
            {files.map((file, index) => (
              <div key={`new-${index}`} className="relative">
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
        </div>
      )}

      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg 
        p-3 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-blue-400 bg-blue-50 dark:bg-blue-950/20"
            : isRequired
              ? "border-red-300 bg-red-50 dark:bg-red-950/20"
              : "border-gray-300 dark:border-gray-600 hover:border-gray-400"
        } ${pending ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <input {...getInputProps()} aria-label={label} />
        <div className="flex flex-col items-center space-y-2">
          <Upload
            className={`h-6 w-6 ${
              isDragActive
                ? "text-blue-500"
                : isRequired
                  ? "text-red-500"
                  : "text-gray-400"
            }`}
          />
          <div
            className={`text-sm ${
              isRequired ? "text-red-600" : "text-gray-600 dark:text-gray-400"
            }`}
          >
            {isDragActive ? (
              <p>Solte as imagens aqui...</p>
            ) : (
              <>
                <p>{hasPhotos ? "Adicionar mais fotos" : "Adicionar foto"}</p>
                {isRequired && (
                  <p className="text-xs text-red-500 mt-1">Obrigatório</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {(error || validationError) && (
        <p className="text-sm text-red-500 mt-1">{error || validationError}</p>
      )}

      {/* Image Modal */}
      <Dialog
        open={!!imageModalOpen}
        onOpenChange={() => setImageModalOpen(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Visualizar Foto - {label}</DialogTitle>
            <DialogDescription>Foto do checklist do veículo</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center">
            {imageModalOpen && (
              <Image
                src={imageModalOpen}
                alt={label}
                width={800}
                height={600}
                className="max-w-full max-h-96 object-contain rounded-lg"
                // Sempre sem o otimizador do Next — ver update-fuel-form-submit
                // do admin: a URL assinada do R2 nao passa por remotePatterns
                // e a imagem ja vem redimensionada em WebP da API.
                unoptimized
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export { PhotoUpload };
