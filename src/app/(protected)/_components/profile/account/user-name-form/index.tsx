"use client";

import { useMemo } from "react";
import { useFormStatus, useFormState } from "react-dom";
import { handleUpdateUserName } from "@/actions/user/update-username";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";
import { Loader } from "lucide-react";

import { ProtectedContentSectionColumns } from "../../../layout/protected-content-section-collumns";
import { useUserNameForm } from "./hooks";

import type {
  UserNameFormSubmitProps,
  UserNameProps,
} from "./user-name-form.types";
import { guardFormAction } from "@/lib/action-result";
import { cn } from "@/lib/utils";
import { validateUserNameFormSchema } from "@/schemas/update-username-schema";
import { useLiveValidation } from "@/components/shared/live-validation";

const UserNameFormSubmit = ({
  userNameValue,
  handleUserName,
  isUpdated,
  error,
  message,
}: UserNameFormSubmitProps): JSX.Element => {
  const { pending } = useFormStatus();

  return (
    <ProtectedContentSectionColumns
      title={"Seu Nome"}
      description={
        "Insira um novo nome de exibição que você gostaria de usar para sua conta."
      }
    >
      <div className="flex w-full flex-wrap items-center gap-2">
        <Label className="sr-only" htmlFor="userName">
          Nome
        </Label>

        <Input
          id="userName"
          name="userName"
          size={32}
          onChange={(event) => handleUserName(event.target.value)}
          value={userNameValue}
          disabled={pending || error}
          autoComplete="name"
          aria-invalid={message ? true : undefined}
          aria-describedby={
            message ? "userName-error userName-hint" : "userName-hint"
          }
          className={cn(
            "min-w-0 flex-1 basis-48",
            message && "border-red-600 dark:border-red-500",
          )}
        />

        <Button
          type="submit"
          disabled={pending || !isUpdated || error}
          variant={isUpdated ? "default" : "outline"}
        >
          <p>Salvar Alterações</p>
          {pending && (
            <div className="ml-2 animate-spin">
              <Loader />
            </div>
          )}
        </Button>
      </div>
      <div className="flex flex-col justify-between gap-1 p-1">
        {message && (
          <p
            id="userName-error"
            role="alert"
            className="break-words text-xs leading-4 text-destructive"
          >
            {message}
          </p>
        )}
        <p id="userName-hint" className="text-[13px] text-muted-foreground">
          Nome e sobrenome, até 100 caracteres
        </p>
      </div>
    </ProtectedContentSectionColumns>
  );
};

const UserNameForm = ({ userName, error }: UserNameProps): JSX.Element => {
  const [state, dispatch] = useFormState(
    guardFormAction(handleUpdateUserName),
    null,
  );
  const { isUpdated, handleUserName, userNameValue } = useUserNameForm({
    state,
    initialUserName: userName,
    error,
  });

  // One object per answer: a new object is read as a new refusal.
  const serverErrors = useMemo(
    () =>
      Array.isArray(state?.userNameError)
        ? { userName: state.userNameError }
        : null,
    [state],
  );

  // Live validation (decision 16.700) with the action's own schema.
  const live = useLiveValidation({
    schema: validateUserNameFormSchema,
    values: { userName: userNameValue },
    serverErrors,
  });

  return (
    <form ref={live.ref} action={dispatch} noValidate>
      <UserNameFormSubmit
        isUpdated={isUpdated}
        handleUserName={handleUserName}
        userNameValue={userNameValue}
        error={error}
        message={live.messageOf("userName")}
      />
    </form>
  );
};

export { UserNameForm };
