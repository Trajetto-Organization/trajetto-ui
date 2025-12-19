import { useRef, useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";

import { Area } from "react-easy-crop";

import { getCroppedImg } from "@/lib/crop-image";
import { toast } from "sonner";

import { FileUploadProps } from "../dto";

function useFileUpload({
  accept,
  enableCrop,
  maxSize,
  singleFile,
  onChange,
  onCropStateChange,
  onGenerateCropReady,
  croppedBlob,
  onCropComplete,
  onBackToUpload,
}: FileUploadProps) {
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

  return {
    crop,
    zoom,
    showCrop,
    showFileInfo,
    handleClick,
    handleInternalBackToUpload,
    onCropCompleteCallback,
    onZoomChange,
    onCropChange,
    getRootProps,
    isDragActive,
    fileInputRef,
    handleFileChange,
    files,
    imageSrc,
    setZoom,
  };
}

export { useFileUpload };
