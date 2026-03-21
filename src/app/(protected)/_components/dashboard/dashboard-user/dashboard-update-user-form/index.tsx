import { useFormState, useFormStatus } from "react-dom";
import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogTitle,
  DialogHeader,
} from "@/components/ui/dialog";

import { Button, buttonVariants } from "@/components/ui/button";
import { Loader, X } from "lucide-react";

import FormInput from "@/components/shared/custom/form-input";
import { SelectField } from "@/app/(protected)/_components/shared/custom/select-field";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import type { DashboardUserRegistrationProps } from "../dashboard-user.types";
import type {
  DashboardUpdateUserFormSubmitProps,
  DashboardUpdateUserFormState,
} from "./dashboard-update-user-form.types";

import {
  roleLabels,
  UserBusinessRole,
} from "@/app/(protected)/_components/shared/common.types";

import { appendDataToForm } from "@/lib/append-data-form";
import { handleUpdateUserRegistration } from "@/actions/user/update-user-registration";

import { SearchProfileAccess } from "@/app/(protected)/_components/shared/searches/search-profile-access";
import { SearchDriver } from "@/app/(protected)/_components/shared/searches/search-driver";

import { cn } from "@/lib/utils";

import { useDashboardUpdateUserForm } from "./hooks";
import { useAuthStore } from "@/store/auth-store";

interface UpdateUserProps {
  userData: DashboardUserRegistrationProps;
  handleOpenUpdateUser: () => void;
  isUpdateUser: boolean;
}

const DashboardUpdateUserFormSubmit = ({
  state,
  handleUpdateSearchProfileAccessInputValue,
  handleUpdateSearchDriverInputValue,
  handleUpdateUserEmail,
  handleUpdateUserName,
  handleUpdateUserRole,
  handleOpenUpdateUser,
  isDirty,
  userType,
  setUserType,
  userValues: {
    userEmail,
    userName,
    userRole,
    commandProfileAccessInputValue: { searchProfileAccessInputValue },
    commandDriverInputValue: { searchDriverInputValue, driverId },
  },
}: DashboardUpdateUserFormSubmitProps) => {
  const { pending } = useFormStatus();

  const { businessId, role } = useAuthStore();
  const roleOptions = Object.values(UserBusinessRole)
    .filter(
      (roleItem) =>
        role !== UserBusinessRole.BUSINESS_USER ||
        roleItem === UserBusinessRole.BUSINESS_USER,
    )
    .map((roleItem) => ({
      value: roleItem,
      label: roleLabels[roleItem],
    }));

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
        <FormInput
          label={"Email *"}
          htmlfor={"email"}
          name="email"
          type="email"
          autoComplete="email"
          onChange={(event) => handleUpdateUserEmail(event.currentTarget.value)}
          errorName={state?.updateUserError?.email}
          placeholder={"E-mail"}
          disabled={pending}
          value={userEmail}
        />

        <FormInput
          label={"Nome *"}
          htmlfor={"name"}
          name="name"
          type="text"
          autoComplete="name"
          onChange={(event) => handleUpdateUserName(event.currentTarget.value)}
          errorName={state?.updateUserError?.name}
          placeholder={"Nome"}
          disabled={pending}
          value={userName}
        />

        <SelectField
          label="Nível de acesso *"
          htmlfor="role"
          name="role"
          placeholder="Nível de acesso"
          value={userRole}
          onChange={(value) => {
            handleUpdateUserRole(value);
            handleUpdateSearchProfileAccessInputValue({
              profileAccessId: "",
              searchProfileAccessInputValue: "",
            });
            handleUpdateSearchDriverInputValue({
              driverId: "",
              searchDriverInputValue: "",
              driverCnh: "",
            });
          }}
          errorName={state.updateUserError?.role}
          options={roleOptions}
          disabled={pending}
        />

        <div
          className="flex items-center justify-center
          p-4 bg-muted/50 rounded-lg border border-dashed"
        >
          <p className="text-sm text-muted-foreground text-center">
            🔐 Por segurança, a senha só poderá ser alterada pelo próprio
            usuário
          </p>
        </div>
      </div>

      {userRole === "BUSINESS_USER" && (
        <div
          className="mt-6 p-4 border rounded-lg
          bg-gradient-to-br from-muted/40 to-muted/20"
        >
          <div
            className="flex flex-col sm:flex-row 
            sm:items-center sm:justify-between gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="user-type-switch"
                className="text-sm font-semibold"
              >
                Tipo de usuário
              </Label>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {userType === "employee"
                  ? "Colaborador administrativo com perfil de acesso"
                  : "Motorista operacional"}
              </p>
            </div>
            <div
              className="flex items-center gap-3 bg-background
              px-4 py-2.5 rounded-md border shadow-sm 
              w-full sm:w-auto justify-center"
            >
              <span
                className={cn(
                  "text-sm font-medium transition-colors whitespace-nowrap",
                  userType === "employee"
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                Colaborador
              </span>
              <Switch
                id="user-type-switch"
                checked={userType === "driver"}
                onCheckedChange={(checked) => {
                  setUserType(checked ? "driver" : "employee");
                  if (checked) {
                    handleUpdateSearchProfileAccessInputValue({
                      profileAccessId: "",
                      searchProfileAccessInputValue: "",
                    });
                  } else {
                    handleUpdateSearchDriverInputValue({
                      driverId: "",
                      searchDriverInputValue: "",
                      driverCnh: "",
                    });
                  }
                }}
                disabled={pending}
              />
              <span
                className={cn(
                  "text-sm font-medium transition-colors whitespace-nowrap",
                  userType === "driver"
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                Motorista
              </span>
            </div>
          </div>
        </div>
      )}

      {((userRole &&
        searchProfileAccessInputValue &&
        userRole !== "BUSINESS_ADMIN") ||
        (userRole === "BUSINESS_USER" &&
          userType === "driver" &&
          searchDriverInputValue)) && (
        <div className="grid grid-cols-1 gap-4 w-full mt-6">
          {userRole !== "BUSINESS_ADMIN" && searchProfileAccessInputValue && (
            <div className="flex items-center gap-2 w-full ml-auto">
              <div
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "border-dashed truncate h-8 text-left",
                )}
              >
                <span>Perfil:</span>
                <span className="w-full truncate">
                  {searchProfileAccessInputValue}
                </span>
              </div>

              <Button
                className="h-8 w-4"
                variant="ghost"
                onClick={() =>
                  handleUpdateSearchProfileAccessInputValue({
                    profileAccessId: "",
                    searchProfileAccessInputValue: "",
                  })
                }
              >
                <X />
              </Button>
            </div>
          )}

          {userRole === "BUSINESS_USER" &&
            userType === "driver" &&
            searchDriverInputValue && (
              <div className="flex items-center gap-2 w-full ml-auto">
                <div
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "border-dashed truncate h-8 text-left",
                  )}
                >
                  <span>Motorista:</span>
                  <span className="w-full truncate">
                    {searchDriverInputValue}
                  </span>
                </div>

                <Button
                  className="h-8 w-4"
                  variant="ghost"
                  onClick={() =>
                    handleUpdateSearchDriverInputValue({
                      driverId: "",
                      searchDriverInputValue: "",
                      driverCnh: "",
                    })
                  }
                >
                  <X />
                </Button>
              </div>
            )}
        </div>
      )}

      {userRole && userRole !== "BUSINESS_ADMIN" && (
        <div className="grid mt-4 grid-cols-1 gap-4">
          {userType === "employee" && (
            <SearchProfileAccess
              errorProfileAccessId={state.updateUserError?.profileAccessId}
              searchProfileAccessInputValue={searchProfileAccessInputValue}
              businessId={businessId as string}
              handleUpdateSearchProfileAccessInputValue={
                handleUpdateSearchProfileAccessInputValue
              }
            />
          )}

          {userType === "driver" && (
            <SearchDriver
              errorDriverId={state.updateUserError?.driverId}
              selectedDriverId={driverId}
              businessId={businessId as string}
              handleUpdateSearchDriverInputValue={
                handleUpdateSearchDriverInputValue
              }
            />
          )}
        </div>
      )}

      <div className="flex justify-end mt-8 gap-2">
        <Button type="button" variant="outline" onClick={handleOpenUpdateUser}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending || !isDirty}>
          <span>Editar Usuário</span>
          {pending && (
            <div className="ml-2 animate-spin">
              <Loader />
            </div>
          )}
        </Button>
      </div>
    </>
  );
};

const DashboardUpdateUserForm = ({
  userData,
  handleOpenUpdateUser,
  isUpdateUser,
}: UpdateUserProps): JSX.Element => {
  const defaultState: DashboardUpdateUserFormState = {};
  const [state, dispatch] = useFormState<
    DashboardUpdateUserFormState,
    FormData
  >(handleUpdateUserRegistration, defaultState);

  const {
    formRef,
    handleUpdateSearchProfileAccessInputValue,
    handleUpdateSearchDriverInputValue,
    handleUpdateUserEmail,
    handleUpdateUserName,
    handleUpdateUserRole,
    commandProfileAccessInputValue,
    commandDriverInputValue,
    userEmail,
    userName,
    userRole,
    userType,
    setUserType,
    isDirty,
  } = useDashboardUpdateUserForm({
    state,
    handleOpenUpdateUser,
    userValues: userData,
    isUpdateUser,
  });

  const { businessId } = useAuthStore();

  const updateUserForm = (userFormData: FormData) => {
    const updateUserData = {
      businessId: businessId as string,
      profileAccessId: commandProfileAccessInputValue.profileAccessId,
      driverId: commandDriverInputValue.driverId,
      userId: userData.id,
      userType: userType,
    };

    appendDataToForm(userFormData, updateUserData);
    return dispatch(userFormData);
  };

  return (
    <Dialog
      onOpenChange={() => {
        if (isUpdateUser) {
          formRef.current?.reset();

          const resetProfileAccessInputValue = {
            searchProfileAccessInputValue: "",
            profileAccessId: "",
          };

          const resetDriverInputValue = {
            searchDriverInputValue: "",
            driverId: "",
            driverCnh: "",
          };

          handleUpdateSearchProfileAccessInputValue(
            resetProfileAccessInputValue,
          );

          handleUpdateSearchDriverInputValue(resetDriverInputValue);
        }

        handleOpenUpdateUser();
      }}
      open={isUpdateUser}
    >
      <DialogScrollContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">Editar Usuário</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Insira as informações solicitadas abaixo para concluir a edição do
            usuário.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={updateUserForm}>
          <DashboardUpdateUserFormSubmit
            state={state}
            handleOpenUpdateUser={handleOpenUpdateUser}
            handleUpdateUserEmail={handleUpdateUserEmail}
            handleUpdateUserName={handleUpdateUserName}
            handleUpdateUserRole={handleUpdateUserRole}
            handleUpdateSearchProfileAccessInputValue={
              handleUpdateSearchProfileAccessInputValue
            }
            handleUpdateSearchDriverInputValue={
              handleUpdateSearchDriverInputValue
            }
            isDirty={isDirty}
            userType={userType}
            setUserType={setUserType}
            userValues={{
              userEmail,
              userName,
              userRole,
              commandProfileAccessInputValue,
              commandDriverInputValue,
            }}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { DashboardUpdateUserForm };
