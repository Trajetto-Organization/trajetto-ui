import { useFormState, useFormStatus } from "react-dom";
import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogTitle,
  DialogHeader,
} from "@/components/ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Button, buttonVariants } from "@/components/ui/button";
import { Loader, X } from "lucide-react";

import FormInput from "@/components/custom/form-input";
import { Label } from "@/components/ui/label";

import { Switch } from "@/components/ui/switch";

import { DashboardUserRegistrationProps } from "../dto";
import {
  useUpdateGenerateRandomPassword,
  useDashboardUpdateUserForm,
} from "./hooks";

import { appendExtraDataToForm } from "@/lib/append-extra-data-form";
import { handleUpdateUserRegistration } from "@/actions/update-user-registration";

import {
  DashboardUpdateUserFormSubmitProps,
  DashboardUpdateUserFormState,
} from "./dto";
import { roleLabels, UserBusinessRole } from "../../../dto";

import { SearchProfileAccess } from "../../../search-profile-access";
import { SearchDriver } from "../../../search-driver";

import { cn } from "@/lib/utils";
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
  const { handleGeneratePassword, handleChangePassword, password } =
    useUpdateGenerateRandomPassword();

  const { businessId, role } = useAuthStore();

  // Only MASTER users can set custom passwords
  const canSetCustomPassword = role === "MASTER";

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
        <FormInput
          label={"Email"}
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
          label={"Nome"}
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

        <div className="w-full flex flex-col gap-3">
          <Label
            htmlFor="role"
            className={cn(
              state.updateUserError?.role && "h-4 truncate text-red-500",
            )}
          >
            {state.updateUserError?.role
              ? state.updateUserError?.role
              : "Nível de acesso"}
          </Label>

          <Select
            name="role"
            disabled={pending}
            value={userRole}
            onValueChange={(value) => {
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
          >
            <SelectTrigger id="role">
              <SelectValue placeholder="Nível de acesso" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(UserBusinessRole)
                .filter(
                  (roleItem) =>
                    role !== UserBusinessRole.BUSINESS_USER ||
                    roleItem === UserBusinessRole.BUSINESS_USER,
                )
                .map((roleItem) => (
                  <SelectItem
                    key={roleItem}
                    value={roleItem}
                    className="cursor-pointer
                    hover:bg-accent hover:text-accent-foreground"
                  >
                    {roleLabels[roleItem]}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {canSetCustomPassword && (
          <div className="flex items-end gap-2 w-full">
            <div className="w-full -mt-1">
              <FormInput
                label="Senha"
                htmlfor="password"
                name="password"
                type="password"
                autoComplete="new-password"
                errorName={state?.updateUserError?.password}
                placeholder="Senha"
                value={password}
                onChange={(e) => handleChangePassword(e.target.value)}
                disabled={pending}
              />
            </div>

            <Button
              type="button"
              variant="ghost"
              onClick={handleGeneratePassword}
              disabled={pending}
            >
              Gerar
            </Button>
          </div>
        )}

        {!canSetCustomPassword && (
          <div
            className="flex items-center justify-center
            p-4 bg-muted/50 rounded-lg border border-dashed"
          >
            <p className="text-sm text-muted-foreground text-center">
              🔐 A senha será gerada automaticamente e enviada por e-mail ao
              usuário
            </p>
          </div>
        )}
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
        userRole !== "BUSINESS_ADMIN" &&
        searchProfileAccessInputValue !== "N/A") ||
        (userRole === "BUSINESS_USER" &&
          userType === "driver" &&
          searchDriverInputValue &&
          searchDriverInputValue !== "N/A")) && (
        <div className="grid grid-cols-1 gap-4 w-full mt-6">
          {userRole !== "BUSINESS_ADMIN" &&
            searchProfileAccessInputValue &&
            searchProfileAccessInputValue !== "N/A" && (
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
            searchDriverInputValue &&
            searchDriverInputValue !== "N/A" && (
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
        <Button type="submit" disabled={pending || (!isDirty && !password)}>
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
      <DialogScrollContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Editar Usuário</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Insira as informações solicitadas abaixo para concluir a edição do
            usuário.
          </DialogDescription>
        </DialogHeader>

        <form
          ref={formRef}
          action={(formData: FormData) => {
            const extraData = {
              businessId: businessId as string,
              profileAccessId: commandProfileAccessInputValue.profileAccessId,
              driverId: commandDriverInputValue.driverId,
              userId: userData.id,
              userType: userType,
            };

            appendExtraDataToForm(formData, extraData);
            return dispatch(formData);
          }}
        >
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
