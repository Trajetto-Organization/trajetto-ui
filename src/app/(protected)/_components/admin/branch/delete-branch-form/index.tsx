"use client";

import { useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Loader, MailCheck, ShieldAlert, Trash } from "lucide-react";

import { handleDeleteBranch } from "@/actions/branch/delete-branch";
import { handleRequestBranchDeletion } from "@/actions/branch/request-branch-deletion";

import { useDeleteBranchForm } from "./hooks";
import { toast } from "sonner";

interface DeleteBranchProps {
  businessId: string;
  branchId: string;
  branchName: string;
}

const ConfirmNameStep = ({
  branchName,
  confirmationText,
  setConfirmationText,
  isRequesting,
  onContinue,
}: {
  branchName: string;
  confirmationText: string;
  setConfirmationText: (value: string) => void;
  isRequesting: boolean;
  onContinue: () => void;
}): JSX.Element => {
  const isConfirmed = confirmationText === branchName;

  const deleteBranchList = [
    {
      data: `<strong>Validação prévia:</strong> A exclusão falhará se houver veículos associados a esta filial`,
    },
    {
      data: `<strong>Validação prévia:</strong> A exclusão falhará se houver motoristas associados a esta filial`,
    },
    {
      data: `<strong>Validação prévia:</strong> A exclusão falhará se houver ordens de serviço associadas a esta filial`,
    },
    {
      data: `<strong>Validação prévia:</strong> A exclusão falhará se houver combustíveis associados a esta filial`,
    },
    {
      data: `<strong>Validação prévia:</strong> A exclusão falhará se houver checklist veiculares associados a esta filial`,
    },
    {
      data: `<strong>Validação prévia:</strong> A exclusão falhará se houver registros finaceiros (contas a pagar) associadas a esta filial`,
    },
    {
      data: `<strong>Validação prévia:</strong> A exclusão falhará se houver multas associadas a esta filial`,
    },
    {
      data: "Todos os veículos vinculados a esta filial serão excluídos",
    },
    {
      data: "Todos os motoristas associados a esta filial serão excluídos",
    },
    {
      data: "Todas as ordens de serviço registradas nesta filial serão excluídas",
    },
    {
      data: "Todos os combustíveis registrados nesta filial serão excluídos",
    },
    {
      data: "Todos os checklist veiculares registrados nesta filial serão excluídos",
    },
    {
      data: "Todos os registros financeiros (contas a pagar) da filial serão removidos",
    },
    {
      data: "Todas as multas registradas nesta filial serão excluídas",
    },
    {
      data: "Esta ação não pode ser desfeita",
    },
  ];

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle className="text-red-600 dark:text-red-500">
          Deletar Filial
        </AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div className="space-y-4">
            <p>
              Esta ação é{" "}
              <strong className="text-foreground">
                permanente e irreversível
              </strong>
              . A exclusão desta filial removerá todos os dados e configurações
              associadas.
            </p>

            <ScrollArea
              className="h-72 rounded-lg border border-red-200 p-4
              dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20"
            >
              <p className="font-medium text-foreground text-sm">
                Consequências imediatas:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                {deleteBranchList.map(({ data }, idx) => (
                  <li key={idx} dangerouslySetInnerHTML={{ __html: data }} />
                ))}
              </ul>
            </ScrollArea>

            <div className="space-y-2">
              <p className="text-sm text-foreground">
                Para confirmar, digite{" "}
                <strong
                  className="font-mono text-red-600 
                  dark:text-red-400 select-all"
                >
                  {branchName}
                </strong>{" "}
                abaixo:
              </p>
              <Input
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder={branchName}
                className="font-mono text-sm border-red-200 
                dark:border-red-900/50 focus-visible:ring-red-500/30"
                autoComplete="off"
              />
            </div>
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="mt-6 w-full">
        <AlertDialogCancel className="w-full" disabled={isRequesting}>
          Cancelar
        </AlertDialogCancel>
        <Button
          type="button"
          onClick={onContinue}
          disabled={isRequesting || !isConfirmed}
          variant={"secondary"}
          className="bg-red-600 hover:bg-red-700 text-white
          dark:bg-red-600 dark:hover:bg-red-700 dark:text-white
          disabled:opacity-40 disabled:cursor-not-allowed
          transition-all duration-200 w-full"
        >
          <ShieldAlert className="mr-1 size-5" />
          <span>Continuar</span>
          {isRequesting && (
            <div className="animate-spin ml-1">
              <Loader size={16} />
            </div>
          )}
        </Button>
      </AlertDialogFooter>
    </>
  );
};

const EnterCodeStep = ({
  branchName,
  otpCode,
  onOtpChange,
  resendTimer,
  onResend,
  onCancel,
  isResending,
}: {
  branchName: string;
  otpCode: string;
  onOtpChange: (value: string) => void;
  resendTimer: number;
  onResend: () => void;
  onCancel: () => void;
  isResending: boolean;
}): JSX.Element => {
  const { pending } = useFormStatus();
  const isOtpComplete = otpCode.length === 6;

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle className="text-red-600 dark:text-red-500 flex items-center gap-2">
          <MailCheck className="size-5" />
          Digite o código de confirmação
        </AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div className="space-y-4">
            <p>
              Enviamos um código de 6 dígitos para o seu e-mail. Digite-o abaixo
              para confirmar a exclusão da filial{" "}
              <strong className="text-foreground">{branchName}</strong>.
            </p>

            <div
              className="rounded-lg border border-amber-200 dark:border-amber-900/50 
              bg-amber-50/50 dark:bg-amber-950/20 p-3 text-xs text-amber-800 dark:text-amber-300"
            >
              ⚠️ O código expira em <strong>5 minutos</strong>. Esta ação é
              permanente.
            </div>

            <div className="pt-2">
              <InputOTP
                maxLength={6}
                name="code"
                value={otpCode}
                onChange={onOtpChange}
                disabled={pending}
                containerClassName="w-full justify-center"
              >
                <div className="flex w-full justify-between items-center">
                  <InputOTPGroup className="flex-1">
                    {Array.from({ length: 3 }, (_, i) => (
                      <InputOTPSlot key={i} index={i} className="w-full" />
                    ))}
                  </InputOTPGroup>
                  <InputOTPSeparator className="mx-2" />
                  <InputOTPGroup className="flex-1">
                    {Array.from({ length: 3 }, (_, i) => (
                      <InputOTPSlot
                        key={i + 3}
                        index={i + 3}
                        className="w-full"
                      />
                    ))}
                  </InputOTPGroup>
                </div>
              </InputOTP>

              <div className="mt-3 flex justify-center">
                <Button
                  type="button"
                  onClick={onResend}
                  disabled={resendTimer > 0 || pending || isResending}
                  className="rounded-full text-left py-1 px-0 h-7
                  text-xs hover:text-primary text-slate-600 dark:text-slate-300"
                  variant="link"
                  size="sm"
                >
                  {resendTimer > 0
                    ? `Reenviar código (${resendTimer}s)`
                    : "Reenviar código"}
                </Button>
              </div>
            </div>
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="mt-6 w-full">
        <AlertDialogCancel className="w-full" onClick={onCancel}>
          Cancelar
        </AlertDialogCancel>
        <Button
          type="submit"
          disabled={pending || !isOtpComplete}
          variant={"secondary"}
          className="bg-red-600 hover:bg-red-700 text-white
          dark:bg-red-600 dark:hover:bg-red-700 dark:text-white
          disabled:opacity-40 disabled:cursor-not-allowed
          transition-all duration-200 w-full"
        >
          <ShieldAlert className="mr-1 size-5" />
          <span>Deletar permanentemente</span>
          {pending && (
            <div className="animate-spin ml-1">
              <Loader size={16} />
            </div>
          )}
        </Button>
      </AlertDialogFooter>
    </>
  );
};

const DeleteBranchForm = ({
  businessId,
  branchId,
  branchName,
}: DeleteBranchProps): JSX.Element => {
  const [confirmationText, setConfirmationText] = useState<string>("");
  const [isRequesting, startRequestTransition] = useTransition();

  const [state, dispatch] = useFormState(
    async (_prevState: any, formData: FormData) => {
      const code = (formData.get("code") as string) ?? "";
      return handleDeleteBranch({
        businessId,
        branchId,
        code,
      });
    },
    null,
  );

  const {
    handleDeleteBranchForm,
    isOpenDeleteBranchForm,
    step,
    otpCode,
    resendTimer,
    goToCodeStep,
    handleOtpChange,
    startResendCooldown,
    resetForm,
  } = useDeleteBranchForm(state);

  const handleOpenChange = () => {
    setConfirmationText("");

    resetForm();
    handleDeleteBranchForm();
  };

  const requestDeletion = (showSuccessToast: boolean) => {
    startRequestTransition(async () => {
      const result = await handleRequestBranchDeletion({
        businessId,
        branchId,
      });

      if (result.requestBranchDeletionError) {
        toast.error(result.requestBranchDeletionError);
        return;
      }

      if (result.successMessage) {
        if (showSuccessToast) {
          toast.success(result.successMessage);
        }
      }

      goToCodeStep();
    });
  };

  const handleContinue = () => {
    requestDeletion(true);
  };

  const handleResend = () => {
    requestDeletion(false);
    startResendCooldown();
  };

  const handleCancelToFirstStep = () => {
    setConfirmationText("");
    resetForm();
  };

  return (
    <AlertDialog open={isOpenDeleteBranchForm} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button
          className="w-full text-sm rounded-sm px-2
          h-8 font-normal flex justify-between"
          variant={"ghost"}
        >
          Deletar
          <Trash size={17} className="dark:text-red-500 text-red-600" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-white dark:bg-[#121214]">
        {step === "confirm-name" ? (
          <ConfirmNameStep
            branchName={branchName}
            confirmationText={confirmationText}
            setConfirmationText={setConfirmationText}
            isRequesting={isRequesting}
            onContinue={handleContinue}
          />
        ) : (
          <form action={dispatch}>
            <EnterCodeStep
              branchName={branchName}
              otpCode={otpCode}
              onOtpChange={handleOtpChange}
              resendTimer={resendTimer}
              onResend={handleResend}
              onCancel={handleCancelToFirstStep}
              isResending={isRequesting}
            />
          </form>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { DeleteBranchForm };
