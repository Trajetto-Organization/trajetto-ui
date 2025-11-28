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

export type { FileUploadProps };
