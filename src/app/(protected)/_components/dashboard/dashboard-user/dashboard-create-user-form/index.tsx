import { useFormState, useFormStatus } from "react-dom";
import { Loader, X } from "lucide-react";

import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Button, buttonVariants } from "@/components/ui/button";
import FormInput from "@/components/custom/form-input";

import { handleCreateUser } from "@/actions/create-user";

import {
  DashboardCreateUserContainerProps,
  DashboardCreateUserFormState,
} from "./dto";
import { roleLabels, UserBusinessRole } from "../../../dto";

import { SearchProfileAccess } from "../../../search-profile-access";
import { SearchDriver } from "../../../search-driver";

import {
  useDashboardCreateUserForm,
  useGenerateRandomPassword,
  useSelectUserRole,
} from "./hooks";

import { appendExtraDataToForm } from "@/lib/append-extra-data-form";

import { cn } from "@/lib/utils";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { useAuthStore } from "@/store/auth-store";
import { permissions } from "@/lib/permissions";

import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const DashboardCreateUserFormContainer = ({
  state,
  handleOpenCreateUserForm,
  commandProfileAccessInputValue: { searchProfileAccessInputValue },
  handleUpdateSearchProfileAccessInputValue,
  commandDriverInputValue: { searchDriverInputValue, driverId },
  handleUpdateSearchDriverInputValue,
  userType,
  setUserType,
}: DashboardCreateUserContainerProps): JSX.Element => {
  const { pending } = useFormStatus();
  const { handleGeneratePassword, handleChangePassword, password } =
    useGenerateRandomPassword();

  const { selectedRole, setSelectedRole } = useSelectUserRole();
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
          errorName={state?.createUserError?.email}
          placeholder={"E-mail"}
          disabled={pending}
        />

        <FormInput
          label={"Nome"}
          htmlfor={"name"}
          name="name"
          type="text"
          errorName={state?.createUserError?.name}
          placeholder={"Nome"}
          disabled={pending}
        />

        <div className="w-full flex flex-col gap-3">
          <Label
            htmlFor="role"
            className={cn(
              state.createUserError?.role && "h-4 truncate text-red-500",
            )}
          >
            {state.createUserError?.role
              ? state.createUserError?.role
              : "Nível de acesso"}
          </Label>

          <Select
            name="role"
            disabled={pending}
            onValueChange={(value) => {
              setSelectedRole(value);

              handleUpdateSearchProfileAccessInputValue({
                profileAccessId: "",
                searchProfileAccessInputValue: "",
              });
            }}
          >
            <SelectTrigger>
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
                    className="cursor-pointer hover:bg-accent
                    hover:text-accent-foreground"
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
                errorName={state?.createUserError?.password}
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

      {selectedRole === "BUSINESS_USER" && (
        <div
          className="mt-6 p-4 border rounded-lg
          bg-gradient-to-br from-muted/40 to-muted/20"
        >
          <div
            className="flex items-center 
            justify-between gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="user-type-switch"
                className="text-sm font-semibold"
              >
                Tipo de usuário
              </Label>
              <p
                className="text-xs 
                text-muted-foreground 
                leading-relaxed"
              >
                {userType === "employee"
                  ? "Colaborador administrativo com perfil de acesso"
                  : "Motorista operacional"}
              </p>
            </div>
            <div
              className="flex items-center gap-3 bg-background
              px-4 py-2.5 rounded-md border shadow-sm"
            >
              <span
                className={cn(
                  "text-sm font-medium transition-colors",
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
                  "text-sm font-medium transition-colors",
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

      {((selectedRole && searchProfileAccessInputValue) ||
        (selectedRole && searchDriverInputValue)) && (
        <div className="grid grid-cols-1 gap-4 w-full mt-6">
          {selectedRole !== "BUSINESS_ADMIN" &&
            searchProfileAccessInputValue && (
              <div
                className="flex items-center
                gap-2 w-full ml-auto"
              >
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

          {selectedRole === "BUSINESS_USER" &&
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

      {selectedRole && selectedRole !== "BUSINESS_ADMIN" && (
        <div className="grid mt-4 grid-cols-1 gap-4">
          {userType === "employee" && (
            <SearchProfileAccess
              errorProfileAccessId={state.createUserError?.profileAccessId}
              searchProfileAccessInputValue={searchProfileAccessInputValue}
              businessId={businessId as string}
              handleUpdateSearchProfileAccessInputValue={
                handleUpdateSearchProfileAccessInputValue
              }
            />
          )}

          {userType === "driver" && (
            <SearchDriver
              errorDriverId={state.createUserError?.driverId}
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
        <Button
          type="button"
          variant="outline"
          onClick={handleOpenCreateUserForm}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          <span>Criar Usuário</span>
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

const DashboardCreateUserForm = (): JSX.Element => {
  const defaultState: DashboardCreateUserFormState = {};

  const [state, dispatch] = useFormState(handleCreateUser, null);
  const {
    isCreateUserForm,
    handleOpenCreateUserForm,
    formRef,
    commandProfileAccessInputValue,
    handleUpdateSearchProfileAccessInputValue,
    commandDriverInputValue,
    handleUpdateSearchDriverInputValue,
    userType,
    setUserType,
  } = useDashboardCreateUserForm(state);

  const { businessId } = useAuthStore();

  const permissionsRequired = useCheckMultiplePermissions([
    {
      key: permissions.USER_REGISTRATION_MANAGE,
      action: "write",
      label: getPermissionName(permissions.USER_REGISTRATION_MANAGE),
    },
    {
      key: permissions.PROFILE_ACCESS_MANAGE,
      action: "read",
      label: getPermissionName(permissions.PROFILE_ACCESS_MANAGE),
    },
    {
      key: permissions.DRIVER_MANAGE,
      action: "read",
      label: getPermissionName(permissions.DRIVER_MANAGE),
    },
  ]);

  return (
    <Dialog open={isCreateUserForm} onOpenChange={handleOpenCreateUserForm}>
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <DialogTrigger
                asChild
                disabled={!permissionsRequired.hasAllPermissions}
                data-tutorial="create-button"
              >
                <Button
                  size="sm"
                  className="h-8 w-full"
                  disabled={!permissionsRequired.hasAllPermissions}
                >
                  Criar Usuário
                </Button>
              </DialogTrigger>
            </div>
          </TooltipTrigger>
          {!permissionsRequired.hasAllPermissions && (
            <TooltipContent className="max-w-sm">
              <p>{permissionsRequired.tooltipMessage}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      <DialogScrollContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Criar Novo Usuário</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Insira as informações solicitadas abaixo para concluir a criação do
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
              userType: userType,
            };

            appendExtraDataToForm(formData, extraData);
            return dispatch(formData);
          }}
        >
          <DashboardCreateUserFormContainer
            state={state ?? defaultState}
            handleOpenCreateUserForm={handleOpenCreateUserForm}
            handleUpdateSearchProfileAccessInputValue={
              handleUpdateSearchProfileAccessInputValue
            }
            handleUpdateSearchDriverInputValue={
              handleUpdateSearchDriverInputValue
            }
            commandProfileAccessInputValue={commandProfileAccessInputValue}
            commandDriverInputValue={commandDriverInputValue}
            userType={userType}
            setUserType={setUserType}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { DashboardCreateUserForm };
