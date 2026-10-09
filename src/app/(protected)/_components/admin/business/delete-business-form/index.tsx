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

import { handleDeleteBusiness } from "@/actions/business/delete-business";
import { handleRequestBusinessDeletion } from "@/actions/business/request-business-deletion";

import { useDeleteBusinessForm } from "./hooks";
import { toast } from "sonner";
import { guardFormAction, isStaleActionResult } from "@/lib/action-result";

interface DeleteBusinessProps {
  bussinessId: string;
  businessName: string;
}

const ConfirmNameStep = ({
  businessName,
  confirmationText,
  setConfirmationText,
  isRequesting,
  onContinue,
}: {
  businessName: string;
  confirmationText: string;
  setConfirmationText: (value: string) => void;
  isRequesting: boolean;
  onContinue: () => void;
}): JSX.Element => {
  const isConfirmed = confirmationText === businessName;

  const deleteBusinessList = [
    {
      data: `<strong>Validação prévia:</strong> A exclusão falhará se houver filiais associadas a esta empresa`,
    },
    {
      data: `<strong>Validação prévia:</strong> A exclusão falhará se houver usuários associados a esta empresa`,
    },
    {
      data: `<strong>Validação prévia:</strong> A exclusão falhará se houver motoristas associados a esta empresa`,
    },
    {
      data: "Todas as filiais vinculadas a esta empresa serão excluídas permanentemente",
    },
    {
      data: "Todos os usuários associados a esta empresa perderão acesso ao sistema",
    },
    {
      data: "Todos os perfis de acesso e permissões desta empresa serão removidos",
    },
    {
      data: "Todos os veículos, motoristas, peças e tipos de combustível serão excluídos",
    },
    {
      data: "Todas as ordens de serviço e registros financeiros serão excluídos",
    },
    {
      data: "Todas as atividades, notificações e colunas kanban serão removidas",
    },
    {
      data: "Todas as multas registradas na empresa serão excluídas",
    },
    {
      data: "Esta ação não pode ser desfeita",
    },
  ];

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle className="text-destructive">
          Deletar Empresa
        </AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div className="space-y-4">
            <p>
              Esta ação é{" "}
              <strong className="text-foreground">
                permanente e irreversível
              </strong>
              . A exclusão desta empresa removerá todos os dados e configurações
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
                {deleteBusinessList.map(({ data }, idx) => (
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
                  {businessName}
                </strong>{" "}
                abaixo:
              </p>
              <Input
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder={businessName}
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
          variant="destructive"
          className="w-full disabled:cursor-not-allowed disabled:opacity-40"
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
  businessName,
  otpCode,
  onOtpChange,
  resendTimer,
  onResend,
  onCancel,
  isResending,
}: {
  businessName: string;
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
        <AlertDialogTitle className="text-destructive flex items-center gap-2">
          <MailCheck className="size-5" />
          Digite o código de confirmação
        </AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div className="space-y-4">
            <p>
              Enviamos um código de 6 dígitos para o seu e-mail. Digite-o abaixo
              para confirmar a exclusão da empresa{" "}
              <strong className="text-foreground">{businessName}</strong>.
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
          variant="destructive"
          className="w-full disabled:cursor-not-allowed disabled:opacity-40"
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

const DeleteBusinessForm = ({
  bussinessId,
  businessName,
}: DeleteBusinessProps): JSX.Element => {
  const [confirmationText, setConfirmationText] = useState<string>("");
  const [isRequesting, startRequestTransition] = useTransition();

  const [state, dispatch] = useFormState(
    guardFormAction(async (_prevState: any, formData: FormData) => {
      const code = (formData.get("code") as string) ?? "";
      return handleDeleteBusiness({
        businessId: bussinessId,
        code,
      });
    }),
    null,
  );

  const {
    isOpenDeleteBusinessForm,
    handleDeleteBusinessForm,
    step,
    otpCode,
    resendTimer,
    goToCodeStep,
    handleOtpChange,
    startResendCooldown,
    resetForm,
  } = useDeleteBusinessForm(state);

  const handleOpenChange = () => {
    setConfirmationText("");

    resetForm();
    handleDeleteBusinessForm();
  };

  const requestDeletion = (showSuccessToast: boolean) => {
    startRequestTransition(async () => {
      const result = await handleRequestBusinessDeletion(bussinessId);

      if (isStaleActionResult(result)) return;

      if (result.requestBusinessDeletionError) {
        toast.error(result.requestBusinessDeletionError);
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
    <AlertDialog
      open={isOpenDeleteBusinessForm}
      onOpenChange={handleOpenChange}
    >
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
      <AlertDialogContent className="bg-background">
        {step === "confirm-name" ? (
          <ConfirmNameStep
            businessName={businessName}
            confirmationText={confirmationText}
            setConfirmationText={setConfirmationText}
            isRequesting={isRequesting}
            onContinue={handleContinue}
          />
        ) : (
          <form action={dispatch}>
            <EnterCodeStep
              businessName={businessName}
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

export { DeleteBusinessForm };
