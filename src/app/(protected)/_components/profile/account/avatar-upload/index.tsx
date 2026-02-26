"use client";

import { useTransition } from "react";

import { useFormState, useFormStatus } from "react-dom";
import { Loader, Trash2, ArrowLeft } from "lucide-react";

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

import { handleDeleteAvatar as deleteAvatarAction } from "@/actions/user/delete-avatar";
import { useAvatarUpload } from "./hooks";

import { AvatarUploadProps } from "./dto";

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
  // Use transition for upload (manual call)
  const [isPending, startTransition] = useTransition();

  // Form state only for delete (simple form action)
  const [deleteState, deleteAction] = useFormState(deleteAvatarAction, null);

  const {
    croppedBlob,
    handleBackToUpload,
    handleCropComplete,
    handleGenerateCropReady,
    handleModalChange,
    handleUploadClick,
    isCropping,
    showDeleteDialog,
    showModal,
    userInitials,
    setShowDeleteDialog,
    setShowModal,
    setIsCropping,
  } = useAvatarUpload({ userName, startTransition, deleteState });

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
          {/* Dialog Header - Always present for accessibility, hidden when not cropping */}
          <DialogHeader className={!isCropping ? "sr-only" : ""}>
            <DialogTitle>
              {avatarUrl ? "Alterar Avatar" : "Adicionar Avatar"}
            </DialogTitle>
            <DialogDescription>
              {isCropping
                ? "Ajuste a posição e o zoom da sua imagem"
                : "Selecione uma imagem para fazer upload"}
            </DialogDescription>
          </DialogHeader>

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
