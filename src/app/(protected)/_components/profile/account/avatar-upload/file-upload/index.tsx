"use client";

import { cn } from "@/lib/utils";
import React, { useRef, useState, useCallback, useEffect } from "react";

import { motion } from "motion/react";

import { IconUpload } from "@tabler/icons-react";
import { useDropzone } from "react-dropzone";

import Cropper from "react-easy-crop";
import { Area } from "react-easy-crop";

import { Slider } from "@/components/ui/slider";

import { ZoomIn, ZoomOut } from "lucide-react";
import { getCroppedImg } from "@/lib/crop-image";

import { toast } from "sonner";

const mainVariant = {
  initial: {
    x: 0,
    y: 0,
  },
  animate: {
    x: 20,
    y: -20,
    opacity: 0.9,
  },
};

const secondaryVariant = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
  },
};

interface FileUploadProps {
  onChange?: (files: File[]) => void;
  singleFile?: boolean;
  maxSize?: number; // in MB
  accept?: string;
  // Avatar-specific props
  enableCrop?: boolean;
  onCropComplete?: (croppedImage: Blob) => void;
  onCropStateChange?: (isCropping: boolean) => void;
  croppedBlob?: Blob | null;
  UploadButton?: React.ReactNode;
  BackButton?: React.ReactNode;
  onBackToUpload?: () => void;
  onGenerateCropReady?: (generateFn: () => Promise<Blob>) => void;
  hasAvatar?: boolean;
}

const FileUpload = ({
  onChange,
  singleFile = false,
  maxSize,
  accept = "image/*",
  enableCrop = false,
  onCropComplete,
  onCropStateChange,
  croppedBlob,
  UploadButton,
  BackButton,
  onBackToUpload,
  onGenerateCropReady,
}: FileUploadProps): JSX.Element => {
  const [files, setFiles] = useState<File[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Crop states
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });

  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const handleFileChange = (newFiles: File[]) => {
    if (newFiles.length === 0) {
      return;
    }

    // Validate file type if accept is provided
    if (accept && enableCrop) {
      const allowedTypes = accept.split(",").map((type) => type.trim());
      const file = newFiles[0];

      const isValidType = allowedTypes.some((type) => {
        if (type.startsWith(".")) {
          return file.name.toLowerCase().endsWith(type.toLowerCase());
        }
        return (
          file.type === type || file.type.startsWith(type.replace("/*", ""))
        );
      });

      if (!isValidType) {
        toast.error(
          "Tipo de arquivo não permitido. Use apenas imagens (JPEG, PNG, WebP).",
        );
        return;
      }
    }

    // Validate file size if maxSize is provided
    if (maxSize) {
      const maxSizeBytes = maxSize * 1024 * 1024;
      const oversizedFile = newFiles.find((file) => file.size > maxSizeBytes);

      if (oversizedFile) {
        toast.error(`Arquivo muito grande. Tamanho máximo: ${maxSize}MB`);
        return;
      }
    }

    // Handle single file mode
    if (singleFile) {
      const file = newFiles[0];
      setFiles([file]);

      // If crop is enabled, read file and prepare for cropping
      if (enableCrop && file) {
        const reader = new FileReader();
        reader.onload = () => {
          setImageSrc(reader.result as string);
          onCropStateChange && onCropStateChange(true);
        };
        reader.readAsDataURL(file);
      } else {
        onChange && onChange([file]);
      }
    } else {
      setFiles((prevFiles) => [...prevFiles, ...newFiles]);
      onChange && onChange(newFiles);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const { getRootProps, isDragActive } = useDropzone({
    multiple: !singleFile,
    noClick: true,
    accept: accept ? { [accept]: [] } : undefined,
    onDrop: handleFileChange,
    onDropRejected: (fileRejections) => {
      if (fileRejections.length > 0) {
        const rejection = fileRejections[0];
        if (rejection.errors[0]?.code === "file-invalid-type") {
          toast.error(
            "Tipo de arquivo não permitido. Use apenas imagens (JPEG, PNG, WebP).",
          );
        } else {
          toast.error("Arquivo inválido. Verifique o tipo e tamanho.");
        }
      }
    },
  });

  // Crop handlers
  const onCropChange = useCallback((location: { x: number; y: number }) => {
    setCrop(location);
  }, []);

  const onZoomChange = useCallback((zoom: number) => {
    setZoom(zoom);
  }, []);

  const onCropCompleteCallback = useCallback(
    (croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    [],
  );

  // Expose generate crop function to parent
  useEffect(() => {
    if (imageSrc && croppedAreaPixels && onGenerateCropReady) {
      const generateFreshCrop = async () => {
        return await getCroppedImg(imageSrc, croppedAreaPixels);
      };
      onGenerateCropReady(generateFreshCrop);
    }
  }, [imageSrc, croppedAreaPixels, onGenerateCropReady]);

  // Auto-generate cropped blob when user has a valid crop (for preview)
  useEffect(() => {
    if (croppedBlob) {
      // Blob already exists, don't regenerate
      return;
    }

    const generateCrop = async () => {
      if (imageSrc && croppedAreaPixels && onCropComplete) {
        const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
        onCropComplete(croppedImage);
      }
    };

    // Small delay to allow user to adjust crop
    const timer = setTimeout(generateCrop, 500);
    return () => clearTimeout(timer);
  }, [croppedAreaPixels, imageSrc, onCropComplete, croppedBlob]);

  // Reset internal state when back button triggers reset
  const handleInternalBackToUpload = () => {
    setFiles([]);
    setImageSrc(null);

    setCrop({ x: 0, y: 0 });
    setZoom(1);

    onCropStateChange && onCropStateChange(false);
    onBackToUpload && onBackToUpload();
  };

  // Show crop interface if image is selected and crop is enabled
  const showCrop = enableCrop && imageSrc;
  // Show file info if file is selected
  const showFileInfo = files.length > 0;

  return (
    <div
      className={cn(
        "w-full h-full",
        showCrop ? "space-y-6" : "flex items-center justify-center",
      )}
    >
      {/* File Upload Area - Hide when showing crop */}
      {!showCrop && (
        <div
          {...getRootProps()}
          className="w-full h-full flex items-center justify-center"
        >
          <motion.div
            onClick={handleClick}
            whileHover="animate"
            className="pt-[3.1rem] pb-14 px-6 group/file block rounded-lg 
            cursor-pointer w-full relative overflow-hidden"
          >
            <input
              ref={fileInputRef}
              id="file-upload-handle"
              type="file"
              accept={accept}
              multiple={!singleFile}
              onChange={(e) =>
                handleFileChange(Array.from(e.target.files || []))
              }
              className="hidden"
            />
            <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]">
              <GridPattern />
            </div>
            <div className="flex flex-col items-center justify-center">
              <p
                className="relative z-20 font-sans font-bold 
                text-neutral-700 dark:text-neutral-300 text-xl"
              >
                Upload de Avatar
              </p>
              <p
                className="relative z-20 font-sans font-normal 
              text-neutral-400 dark:text-neutral-400 text-base mt-2"
              >
                Arraste ou solte seus arquivos aqui
              </p>
              {maxSize && (
                <p
                  className="relative z-20 font-sans font-normal 
                  text-neutral-500 dark:text-neutral-500 text-sm mt-4"
                >
                  Tamanho máximo: {maxSize}MB
                </p>
              )}
              <div className="relative w-full mt-10 max-w-xl mx-auto">
                {!enableCrop &&
                  files.length > 0 &&
                  files.map((file, idx) => (
                    <motion.div
                      key={"file" + idx}
                      layoutId={
                        idx === 0 ? "file-upload" : "file-upload-" + idx
                      }
                      className={cn(
                        "relative overflow-hidden z-40 bg-white dark:bg-neutral-900 flex flex-col items-start justify-start md:h-24 p-4 mt-4 w-full mx-auto rounded-md",
                        "shadow-sm",
                      )}
                    >
                      <div
                        className="flex justify-between 
                        w-full items-center gap-4"
                      >
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          layout
                          className="text-base text-neutral-700 
                          dark:text-neutral-300 truncate max-w-xs"
                        >
                          {file.name}
                        </motion.p>
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          layout
                          className="rounded-lg px-2 py-1 w-fit shrink-0 
                          text-sm text-neutral-600 dark:bg-neutral-800 
                          dark:text-white shadow-input"
                        >
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </motion.p>
                      </div>

                      <div
                        className="flex text-sm md:flex-row flex-col items-start 
                        md:items-center w-full mt-2 justify-between 
                        text-neutral-600 dark:text-neutral-400"
                      >
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          layout
                          className="px-1 py-0.5 rounded-md 
                          bg-gray-100 dark:bg-neutral-800"
                        >
                          {file.type}
                        </motion.p>

                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          layout
                        >
                          modified{" "}
                          {new Date(file.lastModified).toLocaleDateString()}
                        </motion.p>
                      </div>
                    </motion.div>
                  ))}
                {!showFileInfo && (
                  <motion.div
                    layoutId="file-upload"
                    variants={mainVariant}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 20,
                    }}
                    className={cn(
                      "relative group-hover/file:shadow-2xl z-40 bg-white dark:bg-neutral-900 flex items-center justify-center h-32 mt-4 w-full max-w-[8rem] mx-auto rounded-md",
                      "shadow-[0px_10px_50px_rgba(0,0,0,0.1)]",
                    )}
                  >
                    {isDragActive ? (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-neutral-600 flex 
                        flex-col items-center"
                      >
                        Soltar
                        <IconUpload
                          className="h-4 w-4 text-neutral-600 
                          dark:text-neutral-400"
                        />
                      </motion.p>
                    ) : (
                      <IconUpload
                        className="h-4 w-4 text-neutral-600 
                        dark:text-neutral-300"
                      />
                    )}
                  </motion.div>
                )}

                {!showFileInfo && (
                  <motion.div
                    variants={secondaryVariant}
                    className="absolute opacity-0 border border-dashed 
                    border-sky-400 inset-0 z-30 bg-transparent flex items-center 
                    justify-center h-32 mt-4 w-full max-w-[8rem] mx-auto rounded-md"
                  />
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Crop Section - Replaces upload area */}
      {showCrop && (
        <>
          <div
            className="relative w-full h-[400px] 
            bg-muted rounded-lg overflow-hidden"
          >
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={onCropChange}
              onCropComplete={onCropCompleteCallback}
              onZoomChange={onZoomChange}
            />
          </div>

          {/* Zoom Slider */}
          <div className="space-y-2">
            <div
              className="flex items-center justify-between 
              text-sm text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <ZoomOut className="w-4 h-4" />
                <span>Zoom</span>
              </div>
              <ZoomIn className="w-4 h-4" />
            </div>
            <Slider
              value={[zoom]}
              onValueChange={(value) => setZoom(value[0])}
              min={1}
              max={3}
              step={0.1}
              className="w-full"
            />
          </div>

          {/* File Information */}
          {files[0] && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "relative overflow-hidden bg-white dark:bg-neutral-900 flex flex-col items-start justify-start p-4 w-full rounded-md border",
                "shadow-sm",
              )}
            >
              <div className="flex justify-between w-full items-center gap-4">
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-base text-neutral-700 
                  dark:text-neutral-300 truncate max-w-xs"
                >
                  {files[0].name}
                </motion.p>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-lg px-2 py-1 w-fit shrink-0 
                  text-sm text-neutral-600 dark:bg-neutral-800 
                  dark:text-white shadow-input"
                >
                  {(files[0].size / (1024 * 1024)).toFixed(2)} MB
                </motion.p>
              </div>

              <div
                className="flex text-sm md:flex-row flex-col items-start 
                md:items-center w-full mt-2 justify-between 
                text-neutral-600 dark:text-neutral-400"
              >
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="px-1 py-0.5 rounded-md 
                  bg-gray-100 dark:bg-neutral-800"
                >
                  {files[0].type}
                </motion.p>

                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  modified{" "}
                  {new Date(files[0].lastModified).toLocaleDateString()}
                </motion.p>
              </div>
            </motion.div>
          )}

          {/* Hidden input for cropped blob */}
          {croppedBlob && (
            <input
              type="hidden"
              name="avatar"
              value="cropped-blob-placeholder"
            />
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {BackButton &&
              React.cloneElement(BackButton as React.ReactElement, {
                onClick: handleInternalBackToUpload,
              })}
            {UploadButton}
          </div>
        </>
      )}
    </div>
  );
};

function GridPattern(): JSX.Element {
  const columns = 41;
  const rows = 11;

  return (
    <div
      className="flex bg-gray-100 dark:bg-neutral-900 
      shrink-0 flex-wrap justify-center items-center 
      gap-x-px gap-y-px scale-105"
    >
      {Array.from({ length: rows }).map((_, row) =>
        Array.from({ length: columns }).map((_, col) => {
          const index = row * columns + col;
          return (
            <div
              key={`${col}-${row}`}
              className={`w-10 h-10 flex shrink-0 rounded-[2px] ${
                index % 2 === 0
                  ? "bg-gray-50 dark:bg-neutral-950"
                  : "bg-gray-50 dark:bg-neutral-950 shadow-[0px_0px_1px_3px_rgba(255,255,255,1)_inset] dark:shadow-[0px_0px_1px_3px_rgba(0,0,0,1)_inset]"
              }`}
            />
          );
        }),
      )}
    </div>
  );
}

export { FileUpload };
