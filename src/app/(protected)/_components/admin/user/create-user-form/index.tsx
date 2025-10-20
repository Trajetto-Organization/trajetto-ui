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
import { CreateUserContainerProps, CreateUserFormState } from "./dto";

import { SearchProfileAccess } from "../../../search-profile-access";

import { SearchBusiness } from "../../../search-business";
import { SearchDriver } from "../../../search-driver";

import {
  useCreateUserForm,
  useGenerateRandomPassword,
  useSelectUserRole,
} from "./hooks";
import { appendExtraDataToForm } from "@/lib/append-extra-data-form";

import { roleLabels, UserBusinessRole } from "../../../dto";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { cn } from "@/lib/utils";

const CreateUserFormContainer = ({
  state,
  handleOpenCreateUserForm,
  commandBusinnessInputValue: { searchBusinessInputValue, businessId },
  handleUpdateSearchBussinessInputValue,
  commandProfileAccessInputValue: { searchProfileAccessInputValue },
  handleUpdateSearchProfileAccessInputValue,
  commandDriverInputValue: { searchDriverInputValue, driverId },
  handleUpdateSearchDriverInputValue,
  userType,
  setUserType,
}: CreateUserContainerProps): JSX.Element => {
  const { pending } = useFormStatus();
  const { handleGeneratePassword, handleChangePassword, password } =
    useGenerateRandomPassword();

  const { selectedRole, setSelectedRole } = useSelectUserRole();

  return (
    <>
      <div
        className="grid grid-cols-1 
        md:grid-cols-2 gap-4 mt-3"
      >
        <FormInput
          label={"Email"}
          htmlfor={"email"}
          id="email"
          name="email"
          type="email"
          errorName={state?.createUserError?.email}
          placeholder={"E-mail"}
          disabled={pending}
        />

        <FormInput
          label={"Nome"}
          htmlfor={"name"}
          id="name"
          name="name"
          type="text"
          errorName={state?.createUserError?.name}
          placeholder={"Nome"}
          disabled={pending}
        />

        <div className="w-full flex flex-col gap-3">
          <Label
            htmlFor="role"
            id="role"
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

              handleUpdateSearchBussinessInputValue({
                businessId: "",
                searchBusinessInputValue: "",
              });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Nível de acesso" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(UserBusinessRole).map((role) => (
                <SelectItem
                  key={role}
                  value={role}
                  className="cursor-pointer 
                  hover:bg-accent hover:text-accent-foreground"
                >
                  {roleLabels[role]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end gap-2 w-full">
          <div className="w-full -mt-1">
            <FormInput
              label="Senha"
              htmlfor="password"
              name="password"
              id="password"
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
      </div>

      {selectedRole === "BUSINESS_USER" && searchBusinessInputValue && (
        <div
          className="mt-6 p-4 border rounded-lg 
          bg-gradient-to-br from-muted/40 to-muted/20"
        >
          <div className="flex items-center justify-between gap-4">
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
        (selectedRole && searchDriverInputValue) ||
        searchBusinessInputValue) && (
        <div
          className="grid grid-cols-2 
          gap-4 w-full mt-6"
        >
          {searchBusinessInputValue && (
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "border-dashed truncate h-8 text-left",
                )}
              >
                <span>Empresa:</span>
                <span className="w-full truncate">
                  {searchBusinessInputValue}
                </span>
              </div>

              <Button
                className="h-8 w-4"
                variant="ghost"
                onClick={() =>
                  handleUpdateSearchBussinessInputValue({
                    businessId: "",
                    searchBusinessInputValue: "",
                  })
                }
              >
                <X />
              </Button>
            </div>
          )}

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

      {selectedRole && (
        <div
          className={`grid mt-4 ${
            searchBusinessInputValue && selectedRole !== "BUSINESS_ADMIN"
              ? "grid-cols-1 md:grid-cols-2"
              : "grid-cols-1"
          } gap-4`}
        >
          <SearchBusiness
            handleUpdateSearchBussinessInputValue={
              handleUpdateSearchBussinessInputValue
            }
            searchBusinessInputValue={searchBusinessInputValue}
            errorBusinessId={state.createUserError?.businessId}
          />

          {selectedRole === "BUSINESS_USER" &&
            searchBusinessInputValue &&
            userType === "employee" && (
              <SearchProfileAccess
                errorProfileAccessId={state.createUserError?.profileAccessId}
                searchProfileAccessInputValue={searchProfileAccessInputValue}
                businessId={businessId}
                handleUpdateSearchProfileAccessInputValue={
                  handleUpdateSearchProfileAccessInputValue
                }
              />
            )}

          {selectedRole === "BUSINESS_USER" &&
            searchBusinessInputValue &&
            userType === "driver" && (
              <SearchDriver
                errorDriverId={state.createUserError?.driverId}
                selectedDriverId={driverId}
                businessId={businessId}
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

const CreateUserForm = (): JSX.Element => {
  const defaultState: CreateUserFormState = {};

  const [state, dispatch] = useFormState(handleCreateUser, null);
  const {
    isCreateUserForm,
    handleOpenCreateUserForm,
    formRef,
    commandBusinnessInputValue,
    handleUpdateSearchBussinessInputValue,
    commandProfileAccessInputValue,
    handleUpdateSearchProfileAccessInputValue,
    commandDriverInputValue,
    handleUpdateSearchDriverInputValue,
    userType,
    setUserType,
  } = useCreateUserForm(state);

  return (
    <Dialog open={isCreateUserForm} onOpenChange={handleOpenCreateUserForm}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 w-full">
          Criar Usuário
        </Button>
      </DialogTrigger>

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
              businessId: commandBusinnessInputValue.businessId,
              profileAccessId: commandProfileAccessInputValue.profileAccessId,
              driverId: commandDriverInputValue.driverId,
              userType: userType,
            };

            appendExtraDataToForm(formData, extraData);
            return dispatch(formData);
          }}
        >
          <CreateUserFormContainer
            state={state ?? defaultState}
            handleOpenCreateUserForm={handleOpenCreateUserForm}
            handleUpdateSearchBussinessInputValue={
              handleUpdateSearchBussinessInputValue
            }
            handleUpdateSearchProfileAccessInputValue={
              handleUpdateSearchProfileAccessInputValue
            }
            handleUpdateSearchDriverInputValue={
              handleUpdateSearchDriverInputValue
            }
            commandBusinnessInputValue={commandBusinnessInputValue}
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

export { CreateUserForm };
