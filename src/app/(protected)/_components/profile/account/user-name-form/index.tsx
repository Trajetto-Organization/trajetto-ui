"use client";

import { useFormStatus, useFormState } from "react-dom";
import { handleUpdateUserName } from "@/actions/update-username";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";
import { Loader } from "lucide-react";

import { ProtectedContentSectionColumns } from "../../../layout/protected-content-section-collumns";
import { useUserNameForm } from "./hooks";

import { UserNameFormSubmitProps, UserNameProps } from "./dto";

const UserNameFormSubmit = ({
  userNameValue,
  handleUserName,
  isUpdated,
  error,
}: UserNameFormSubmitProps): JSX.Element => {
  const { pending } = useFormStatus();

  return (
    <ProtectedContentSectionColumns
      title={"Seu Nome"}
      description={
        "Insira um novo nome de exibição que você gostaria de usar para sua conta."
      }
    >
      <div className="flex w-full items-center gap-2">
        <Label className="sr-only" htmlFor="userName">
          Nome
        </Label>

        <Input
          id="userName"
          name="userName"
          className="flex-1"
          size={32}
          onChange={(event) => handleUserName(event.target.value)}
          value={userNameValue}
          disabled={pending || error}
          autoComplete="name"
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
      <div className="flex flex-col justify-between p-1">
        <p className="text-[13px] text-muted-foreground">
          Máximo de 100 caracteres
        </p>
      </div>
    </ProtectedContentSectionColumns>
  );
};

const UserNameForm = ({ userName, error }: UserNameProps): JSX.Element => {
  const [state, dispatch] = useFormState(handleUpdateUserName, null);
  const { isUpdated, handleUserName, userNameValue } = useUserNameForm({
    state,
    initialUserName: userName,
    error,
  });

  return (
    <form action={dispatch}>
      <UserNameFormSubmit
        isUpdated={isUpdated}
        handleUserName={handleUserName}
        userNameValue={userNameValue}
        error={error}
      />
    </form>
  );
};

export { UserNameForm };
