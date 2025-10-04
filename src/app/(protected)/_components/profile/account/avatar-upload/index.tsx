"use client";

import { useState, useEffect, useTransition, useRef } from "react";

import { useFormState, useFormStatus } from "react-dom";
import { Loader, Trash2, ArrowLeft } from "lucide-react";

import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { Button } from "@/components/ui/button";
import { FileUpload } from "./file-upload";

import { handleUploadAvatar } from "@/actions/upload-avatar";
import { handleDeleteAvatar as deleteAvatarAction } from "@/actions/delete-avatar";

interface AvatarUploadProps {
  userName: string;
  avatarUrl?: string | null;
}

// Upload button component - no form status needed, we'll use state
function UploadButton({
  hasAvatar,
  onClick,
  isPending,
}: {
  hasAvatar: boolean;
  onClick: () => void;
  isPending: boolean;
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={isPending}
      className="w-full"
      size="lg"
      variant={"default"}
    >
      {isPending ? (
        <>
          <Loader className="mr-2 h-4 w-4 animate-spin" />
          {hasAvatar ? "Atualizando..." : "Adicionando..."}
        </>
      ) : (
        <>{hasAvatar ? "Atualizar Avatar" : "Adicionar Avatar"}</>
      )}
    </Button>
  );
}

// Delete button component with useFormStatus
function DeleteButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
    >
      {pending ? (
        <>
          <Loader className="mr-2 h-4 w-4 animate-spin" />
          Removendo...
        </>
      ) : (
        "Remover"
      )}
    </Button>
  );
}

// Back button component with useFormStatus
function BackButton({ onClick }: { onClick?: () => void }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={pending}
      variant="outline"
      size="lg"
      className="w-full"
    >
      <ArrowLeft className="mr-2 h-4 w-4" />
      Voltar
    </Button>
  );
}

const AvatarUpload = ({
  userName,
  avatarUrl,
}: AvatarUploadProps): JSX.Element => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);

  const [isCropping, setIsCropping] = useState<boolean>(false);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);

  const [uploadResult, setUploadResult] = useState<any>(null);
  const generateCropRef = useRef<(() => Promise<Blob>) | null>(null);

  // Use transition for upload (manual call)
  const [isPending, startTransition] = useTransition();

  // Form state only for delete (simple form action)
  const [deleteState, deleteAction] = useFormState(deleteAvatarAction, null);

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

  return (
    <>
      <div
        className="flex flex-col 
        items-center gap-4 py-8"
      >
        <div className="relative group">
          {/* Avatar with hover effect */}
          <div className="relative">
            <Avatar
              className="h-32 w-32 ring-4 
              ring-background shadow-lg 
              cursor-pointer"
            >
              <AvatarImage src={avatarUrl || undefined} alt={userName} />
              <AvatarFallback
                className="text-3xl font-semibold 
                bg-gradient-to-br from-primary/20 
                to-primary/10"
              >
                {userInitials}
              </AvatarFallback>
            </Avatar>

            {/* Hover overlay - clickable */}
            <button
              onClick={() => setShowModal(true)}
              className="absolute inset-0 rounded-full bg-black/60
              opacity-0 group-hover:opacity-100 transition-all
              duration-200 flex items-center justify-center
              cursor-pointer disabled:cursor-not-allowed"
            >
              <div className="text-white text-center">
                <span className="text-sm font-medium">
                  {avatarUrl ? "Alterar" : "Adicionar"}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Remove Avatar Button - Only shows if has avatar */}
        {avatarUrl && (
          <Button
            onClick={() => setShowDeleteDialog(true)}
            variant="ghost"
            size="sm"
            className="text-muted-foreground 
            hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remover Avatar
          </Button>
        )}
      </div>

      {/* Modal with FileUpload */}
      <Dialog open={showModal} onOpenChange={handleModalChange}>
        <DialogContent
          className={`sm:max-w-[560px] max-h-[90vh]
          overflow-y-auto ${!isCropping ? "p-0" : ""}`}
        >
          {/* Dialog Header - Only show when cropping */}
          {isCropping && (
            <DialogHeader>
              <DialogTitle>
                {avatarUrl ? "Alterar Avatar" : "Adicionar Avatar"}
              </DialogTitle>
              <DialogDescription>
                Ajuste a posição e o zoom da sua imagem
              </DialogDescription>
            </DialogHeader>
          )}

          <FileUpload
            singleFile={true}
            maxSize={5}
            accept="image/jpeg,image/jpg,image/png,image/webp"
            enableCrop={true}
            onCropComplete={handleCropComplete}
            onCropStateChange={setIsCropping}
            croppedBlob={croppedBlob}
            onGenerateCropReady={handleGenerateCropReady}
            UploadButton={
              <UploadButton
                hasAvatar={!!avatarUrl}
                onClick={handleUploadClick}
                isPending={isPending}
              />
            }
            BackButton={<BackButton />}
            onBackToUpload={handleBackToUpload}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover avatar?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover sua foto de perfil? Você poderá
              adicionar uma nova foto a qualquer momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form action={deleteAction}>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <DeleteButton />
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export { AvatarUpload };
