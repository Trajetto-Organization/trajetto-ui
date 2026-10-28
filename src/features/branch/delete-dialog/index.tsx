"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader, MailCheck } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";

import { handleDeleteBranch } from "@/actions/branch/delete-branch";
import { handleRequestBranchDeletion } from "@/actions/branch/request-branch-deletion";
import { isStaleActionResult } from "@/lib/action-result";
import { resendCooldownAfterRefusal } from "@/lib/api-error";

import { refreshAfterBranchWrite } from "../lib/after-write";
import type { BranchRow } from "../lib/server-table";

const RESEND_COOLDOWN_SECONDS = 60;

/**
 * What the API actually does (delete-branch-usecase): it REFUSES while
 * anything points at the branch, and deletes only the branch itself. The old
 * dialog listed both "a exclusão falhará se houver veículos" and "todos os
 * veículos serão excluídos", which cannot both be true.
 */
const CHECKS = [
  "Se houver veículos, motoristas, ordens de serviço, abastecimentos, checklists, contas a pagar ou multas nesta filial, a exclusão é recusada com as quantidades.",
  "Um código de 6 dígitos é enviado ao seu e-mail e vale por 5 minutos.",
  "Depois da exclusão, os demais administradores da empresa recebem um aviso por e-mail.",
  "Esta ação não pode ser desfeita.",
];

type Step = "confirm-name" | "enter-code";

interface DeleteBranchDialogProps {
  branch: BranchRow;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Deleting a branch: type its name, receive a code by e-mail, confirm with
 * the code (the API's two-step flow). One dialog for /admin and /dashboard.
 */
const DeleteBranchDialog = ({
  branch,
  isOpen,
  onClose,
}: DeleteBranchDialogProps): JSX.Element => {
  const [step, setStep] = useState<Step>("confirm-name");
  const [confirmationText, setConfirmationText] = useState<string>("");
  const [otpCode, setOtpCode] = useState<string>("");
  const [resendTimer, setResendTimer] = useState<number>(0);

  const [isRequesting, startRequest] = useTransition();
  const [isDeleting, startDelete] = useTransition();

  const branchName = branch.corporate_reason;
  const isBusy = isRequesting || isDeleting;

  useEffect(() => {
    if (resendTimer <= 0) return;

    const timeoutId = setTimeout(
      () => setResendTimer((value) => value - 1),
      1000,
    );

    return () => clearTimeout(timeoutId);
  }, [resendTimer]);

  const requestCode = (announce: boolean) => {
    startRequest(async () => {
      const result = await handleRequestBranchDeletion({
        businessId: branch.businessId,
        branchId: branch.id,
      });

      if (isStaleActionResult(result)) return;

      // The refusal lists what still depends on the branch; shown as is.
      if (result.requestBranchDeletionError) {
        toast.error(result.requestBranchDeletionError);
        return;
      }

      if (announce && result.successMessage)
        toast.success(result.successMessage);

      setStep("enter-code");
      setResendTimer(RESEND_COOLDOWN_SECONDS);
    });
  };

  const confirmDeletion = () => {
    startDelete(async () => {
      const result = await handleDeleteBranch({
        businessId: branch.businessId,
        branchId: branch.id,
        code: otpCode,
      });

      if (isStaleActionResult(result)) return;

      if (result.deleteBranchError) {
        toast.error(result.deleteBranchError);
        setOtpCode("");
        setResendTimer((current) =>
          resendCooldownAfterRefusal(result, current),
        );
        return;
      }

      toast.success(result.successMessage ?? "Filial excluída.");

      void refreshAfterBranchWrite().catch(() =>
        toast.error("Erro ao atualizar dados. Recarregue a página."),
      );

      onClose();
    });
  };

  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isBusy) onClose();
      }}
    >
      <AlertDialogContent>
        {step === "confirm-name" ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive">
                Excluir Filial
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p>
                    Você vai excluir a filial{" "}
                    <strong className="text-foreground">{branchName}</strong>.
                  </p>
                  <p className="font-medium text-foreground">
                    Validações e consequências:
                  </p>
                  <ul className="list-disc space-y-1 pl-5 text-left">
                    {CHECKS.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>

                  <div className="space-y-2 pt-1 text-left">
                    <label
                      htmlFor="confirm-branch-name"
                      className="text-sm text-foreground"
                    >
                      Para confirmar, digite{" "}
                      <strong className="select-all font-mono text-red-600 dark:text-red-400">
                        {branchName}
                      </strong>
                      :
                    </label>
                    <Input
                      id="confirm-branch-name"
                      type="text"
                      value={confirmationText}
                      onChange={(event) =>
                        setConfirmationText(event.target.value)
                      }
                      placeholder={branchName}
                      autoComplete="off"
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={isBusy}
                onClick={onClose}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="flex-1"
                disabled={isBusy || confirmationText !== branchName}
                onClick={() => requestCode(true)}
              >
                Enviar código
                {isRequesting && (
                  <Loader className="ml-2 h-4 w-4 animate-spin" />
                )}
              </Button>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <MailCheck className="size-5" />
                Digite o código de confirmação
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p>
                    Enviamos um código de 6 dígitos para o seu e-mail. Ele
                    confirma a exclusão da filial{" "}
                    <strong className="text-foreground">{branchName}</strong> e
                    vale por 5 minutos.
                  </p>

                  <InputOTP
                    maxLength={6}
                    value={otpCode}
                    onChange={setOtpCode}
                    disabled={isDeleting}
                    containerClassName="w-full justify-center"
                    aria-label="Código de confirmação"
                  >
                    <div className="flex w-full items-center justify-between">
                      <InputOTPGroup className="flex-1">
                        {Array.from({ length: 3 }, (_, index) => (
                          <InputOTPSlot
                            key={index}
                            index={index}
                            className="w-full"
                          />
                        ))}
                      </InputOTPGroup>
                      <InputOTPSeparator className="mx-2" />
                      <InputOTPGroup className="flex-1">
                        {Array.from({ length: 3 }, (_, index) => (
                          <InputOTPSlot
                            key={index + 3}
                            index={index + 3}
                            className="w-full"
                          />
                        ))}
                      </InputOTPGroup>
                    </div>
                  </InputOTP>

                  <div className="flex justify-center">
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-7 px-0 text-xs"
                      disabled={resendTimer > 0 || isBusy}
                      onClick={() => {
                        requestCode(false);
                      }}
                    >
                      {resendTimer > 0
                        ? `Reenviar código (${resendTimer}s)`
                        : "Reenviar código"}
                    </Button>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={isBusy}
                onClick={onClose}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="flex-1"
                disabled={isBusy || otpCode.length !== 6}
                onClick={confirmDeletion}
              >
                Excluir Filial
                {isDeleting && <Loader className="ml-2 h-4 w-4 animate-spin" />}
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { DeleteBranchDialog };
