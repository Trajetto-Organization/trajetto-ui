import { useState, useEffect, useRef, TransitionStartFunction } from "react";
import { handleUploadAvatar } from "@/actions/upload-avatar";

import { toast } from "sonner";

interface DeleteAvatarUploadFormState {
  successMessage?: string;
  avatarError?: string;
}

interface UseAvatarUploadProps {
  userName: string;
  startTransition: TransitionStartFunction;
  deleteState: DeleteAvatarUploadFormState | null;
}

function useAvatarUpload({
  userName,
  startTransition,
  deleteState,
}: UseAvatarUploadProps) {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);

  const [isCropping, setIsCropping] = useState<boolean>(false);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);

  const [uploadResult, setUploadResult] = useState<any>(null);
  const generateCropRef = useRef<(() => Promise<Blob>) | null>(null);

  // Get user initials for fallback
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Handle upload result
  useEffect(() => {
    if (uploadResult?.successMessage) {
      toast.success(uploadResult.successMessage);

      setShowModal(false);
      setCroppedBlob(null);

      setIsCropping(false);
      setUploadResult(null);
    } else if (uploadResult?.avatarError) {
      toast.error(uploadResult.avatarError);
      setUploadResult(null);
    }
  }, [uploadResult]);

  // Handle delete result
  useEffect(() => {
    if (deleteState?.successMessage) {
      toast.success(deleteState.successMessage);
      setShowDeleteDialog(false);
    } else if (deleteState?.avatarError) {
      toast.error(deleteState.avatarError);
    }
  }, [deleteState]);

  const handleCropComplete = (croppedImageBlob: Blob) => {
    setCroppedBlob(croppedImageBlob);
  };

  const handleBackToUpload = () => {
    setCroppedBlob(null);
    setIsCropping(false);
  };

  const handleGenerateCropReady = (generateFn: () => Promise<Blob>) => {
    generateCropRef.current = generateFn;
  };

  // Handle upload click - generate fresh crop at click time
  const handleUploadClick = async () => {
    if (!generateCropRef.current) {
      toast.error("Por favor, selecione uma imagem para fazer o upload.");
      return;
    }

    startTransition(async () => {
      // Generate fresh crop with current crop settings
      const freshBlob = await generateCropRef.current!();

      const formData = new FormData();
      formData.append("avatar", freshBlob, `avatar-${Date.now()}.webp`);

      const result = await handleUploadAvatar(null, formData);
      setUploadResult(result);
    });
  };

  // Reset all states when modal closes
  const handleModalChange = (open: boolean) => {
    setShowModal(open);

    if (!open) {
      // Reset all states when modal closes
      setIsCropping(false);
      setCroppedBlob(null);

      generateCropRef.current = null;
    }
  };

  return {
    showModal,
    showDeleteDialog,
    isCropping,
    croppedBlob,
    userInitials,
    handleCropComplete,
    handleBackToUpload,
    handleGenerateCropReady,
    handleUploadClick,
    handleModalChange,
    setShowDeleteDialog,
    setShowModal,
    setIsCropping,
  };
}

export { useAvatarUpload };
