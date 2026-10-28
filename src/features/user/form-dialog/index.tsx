"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertTriangle, Loader } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogDescription,
  DialogFormFooter,
  DialogHeader,
  DialogScrollContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import FormInput from "@/components/shared/custom/form-input";

import { PickedField } from "@/app/(protected)/_components/shared/custom/picked-field";
import { SelectField } from "@/app/(protected)/_components/shared/custom/select-field";
import { SearchDriver } from "@/app/(protected)/_components/shared/searches/search-driver";
import { SearchProfileAccess } from "@/app/(protected)/_components/shared/searches/search-profile-access";

import { handleCreateUser } from "@/actions/user/create-user";
import { handleUpdateUserRegistration } from "@/actions/user/update-user-registration";
import { createUserSchema } from "@/schemas/create-user-schema";
import { updateUserSchema } from "@/schemas/update-user-schema";

import {
  IGNORE_BLUR_ATTRIBUTE,
  canSubmitForm,
  useLiveValidation,
} from "@/components/shared/live-validation";

import { guardFormAction } from "@/lib/action-result";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";

import {
  changedUserFields,
  editEndsSessions,
  effectiveLinks,
  effectiveRole,
  roleOptionsFor,
  userFormValuesOf,
  userLinkIssue,
  userTypeOf,
  type UserFormValues,
  type UserType,
} from "../lib/user-rules";
import { refreshAfterUserWrite } from "../lib/after-write";
import type { UserRow } from "../types";

type FieldErrors = Partial<
  Record<keyof UserFormValues | "password" | "userType", string[]>
>;

interface UserFormState {
  createUserError?: FieldErrors & { createUserErrorMessage?: string };
  updateUserError?: FieldErrors & { updateUserErrorMessage?: string };
  successMessage?: string;
}

interface UserFormDialogProps {
  /** The page's company: the selector's on /admin, the session's on /dashboard. */
  businessId: string;
  /** Present when editing. */
  user?: UserRow;
  isOpen: boolean;
  onClose: () => void;
}

interface Picked {
  id: string;
  name: string;
}

const NONE: Picked = { id: "", name: "" };

interface SubmitRowProps {
  isEdit: boolean;
  canSubmit: boolean;
  onCancel: () => void;
}

const SubmitRow = ({ isEdit, canSubmit, onCancel }: SubmitRowProps) => {
  const { pending } = useFormStatus();

  return (
    <DialogFormFooter className="mt-6">
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={pending}
        {...{ [IGNORE_BLUR_ATTRIBUTE]: "" }}
      >
        Cancelar
      </Button>

      <Button type="submit" disabled={pending || !canSubmit}>
        <span>{isEdit ? "Salvar Alterações" : "Criar Usuário"}</span>
        {pending && <Loader className="ml-2 h-4 w-4 animate-spin" />}
      </Button>
    </DialogFormFooter>
  );
};

/**
 * Creating and editing a user, one dialog for /admin and /dashboard
 * (decision 8.7).
 *
 * - The company is the page's, always: the user belongs to the company
 *   chosen at the top of the page (decision 16.62). The dialog has no "move
 *   to another company" any more, and the API refuses such a move.
 * - One column, in the order the person is described (decision 16.62): who
 *   (e-mail, name), what kind of user (Colaborador or Motorista, and which
 *   driver), what they may do (level, profile), and on edit the password
 *   link last.
 * - No password field (decision 4.9): a new user gets a link to set theirs,
 *   and the MASTER resets one by sending a new link.
 * - Save stays disabled until something changed (decision 2.5), and the
 *   dialog says beforehand when saving ends the person's sessions (4.6).
 *   Criar is always enabled (decision 16.701).
 * - Live validation (decision 16.700): each field is checked by the action's
 *   own schema once it is left, then on every change; a submit checks all of
 *   them and focuses the first invalid one. The reference form for the
 *   pattern (components/shared/live-validation/README.md).
 */
const UserFormDialog = ({
  businessId,
  user,
  isOpen,
  onClose,
}: UserFormDialogProps): JSX.Element => {
  const isEdit = Boolean(user);
  const actorRole = useAuthStore((state) => state.role);
  const isMaster = actorRole === "MASTER";

  const [state, dispatch] = useFormState<UserFormState, FormData>(
    guardFormAction(isEdit ? handleUpdateUserRegistration : handleCreateUser),
    {},
  );

  const original = useMemo<UserFormValues>(
    () =>
      userFormValuesOf(user ?? { email: "", name: "", role: "", businessId }),
    [user, businessId],
  );

  const [email, setEmail] = useState<string>(original.email);
  const [name, setName] = useState<string>(original.name);
  const [role, setRole] = useState<string>(original.role);
  const [userType, setUserType] = useState<UserType>(userTypeOf(original));
  const [profile, setProfile] = useState<Picked>(
    user?.profileAccessId
      ? { id: user.profileAccessId, name: user.profileAccess?.name ?? "" }
      : NONE,
  );
  const [driver, setDriver] = useState<Picked>(
    user?.driverId
      ? { id: user.driverId, name: user.driver?.name ?? "" }
      : NONE,
  );
  const [sendLink, setSendLink] = useState<boolean>(false);

  // A driver's login is always a plain user: the level is asked only of a
  // Colaborador.
  const submittedRole = effectiveRole(role, userType);

  const current: UserFormValues = effectiveLinks({
    email,
    name,
    role: submittedRole,
    businessId,
    profileAccessId:
      submittedRole === "BUSINESS_USER" && userType === "employee"
        ? profile.id
        : "",
    driverId:
      submittedRole === "BUSINESS_USER" && userType === "driver"
        ? driver.id
        : "",
  });

  const changed = changedUserFields(original, current);
  const canSubmit = canSubmitForm({
    isEdit,
    isDirty: changed.length > 0 || sendLink,
  });
  const endsSessions = isEdit && editEndsSessions(original, current);

  const handledState = useRef<UserFormState | null>(null);

  const errors = isEdit ? state.updateUserError : state.createUserError;

  const live = useLiveValidation({
    schema: isEdit ? updateUserSchema : createUserSchema,
    values: { ...current, userType, sendPasswordSetupLink: sendLink },
    // The link rule needs no other field to be valid first (an object
    // refine waits for the e-mail), so it runs as the client's own rule,
    // in the API's words.
    rules: (values) => {
      const issue = userLinkIssue(values, userType);
      return issue ? { [issue.field]: issue.message } : {};
    },
    fields: ["email", "name", "role", "driverId", "profileAccessId"],
    serverErrors: errors,
    controlIds: { email: "user-email", name: "user-name", role: "user-role" },
  });
  const errorMessage =
    state.createUserError?.createUserErrorMessage ??
    state.updateUserError?.updateUserErrorMessage;

  useEffect(() => {
    if (handledState.current === state) return;
    handledState.current = state;

    if (errorMessage) {
      toast.error(errorMessage);
      return;
    }

    if (state.successMessage) {
      toast.success(state.successMessage);

      void refreshAfterUserWrite().catch(() =>
        toast.error("Erro ao atualizar dados. Recarregue a página."),
      );

      onClose();
    }
  }, [state, errorMessage, isEdit, onClose]);

  const clearLinks = () => {
    setProfile(NONE);
    setDriver(NONE);
  };

  const submit = (formData: FormData) => {
    // The submit listener already stopped an invalid form (and showed why);
    // this only guards a programmatic submit that bypassed it.
    if (!live.isValid()) return;

    formData.set("email", email);
    formData.set("name", name);
    formData.set("role", submittedRole);
    formData.set("businessId", businessId);
    formData.set("profileAccessId", current.profileAccessId);
    formData.set("driverId", current.driverId);
    formData.set("userType", userType);

    if (user) {
      formData.set("userId", user.id);
      formData.set("sendPasswordSetupLink", sendLink ? "true" : "false");
    }

    return dispatch(formData);
  };

  const roleOptions = roleOptionsFor(actorRole);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {/* The access profile dialog's width: one field per row, and the
          footer's Cancelar and Criar/Salvar share the row (decision 3.2). */}
      <DialogScrollContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEdit ? "Editar Usuário" : "Criar Novo Usuário"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize os dados do usuário. Só o que você mudar é salvo."
              : "Preencha os dados do usuário. Ele recebe por e-mail um link para definir a própria senha (válido por 72 horas)."}
          </DialogDescription>
        </DialogHeader>

        <form
          ref={live.ref}
          action={submit}
          noValidate
          className="space-y-4"
          data-user-form
        >
          <FormInput
            label="E-mail *"
            htmlfor="user-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="E-mail de acesso"
            value={email}
            onChange={(event) => setEmail(event.currentTarget.value)}
            errorName={live.errorOf("email")}
          />

          <FormInput
            label="Nome *"
            htmlfor="user-name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Nome completo"
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
            errorName={live.errorOf("name")}
          />

          <div
            data-user-field="type"
            className="space-y-3 rounded-lg border p-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1">
                <Label
                  htmlFor="user-type-switch"
                  className="text-sm font-semibold"
                >
                  Tipo de usuário
                </Label>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {userType === "employee"
                    ? "Colaborador da empresa, com nível e perfil de acesso."
                    : "Login de um motorista no aplicativo."}
                </p>
              </div>

              <div className="flex w-full items-center justify-center gap-3 rounded-md border bg-background px-4 py-2 sm:w-auto">
                <span
                  className={cn(
                    "whitespace-nowrap text-sm font-medium",
                    userType === "employee"
                      ? "text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  Colaborador
                </span>
                <Switch
                  id="user-type-switch"
                  aria-label="Usuário motorista"
                  checked={userType === "driver"}
                  onCheckedChange={(checked) =>
                    setUserType(checked ? "driver" : "employee")
                  }
                />
                <span
                  className={cn(
                    "whitespace-nowrap text-sm font-medium",
                    userType === "driver"
                      ? "text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  Motorista
                </span>
              </div>
            </div>

            {/* The driver link belongs to the type: it is what a Motorista is. */}
            {userType === "driver" &&
              (driver.id ? (
                <PickedField
                  label="Motorista *"
                  htmlFor="user-driver-picked"
                  value={driver.name}
                  clearLabel="Remover motorista"
                  onClear={() => setDriver(NONE)}
                />
              ) : (
                // The wrapper names the field: the search's input id is
                // generated, and leaving it must count as leaving driverId.
                <div data-live-field="driverId">
                  <SearchDriver
                    businessId={businessId}
                    selectedDriverId={driver.id}
                    errorDriverId={live.errorOf("driverId")}
                    handleUpdateSearchDriverInputValue={(picked) =>
                      setDriver({
                        id: picked.driverId,
                        name: picked.searchDriverInputValue,
                      })
                    }
                  />
                </div>
              ))}
          </div>

          {userType === "employee" && (
            <div data-user-field="role">
              <SelectField
                label="Nível de acesso *"
                htmlfor="user-role"
                name="role"
                placeholder="Selecione o nível de acesso"
                value={role}
                onChange={(value) => {
                  setRole(value);
                  if (value === "BUSINESS_ADMIN") clearLinks();
                }}
                errorName={live.errorOf("role")}
                options={roleOptions}
                hint={
                  role === "BUSINESS_ADMIN"
                    ? "O administrador acessa tudo da empresa, sem perfil de acesso."
                    : undefined
                }
              />
            </div>
          )}

          {userType === "employee" && submittedRole === "BUSINESS_USER" && (
            <div data-user-field="profile">
              {profile.id ? (
                <PickedField
                  label="Perfil de acesso *"
                  htmlFor="user-profile-picked"
                  value={profile.name}
                  clearLabel="Remover perfil"
                  onClear={() => setProfile(NONE)}
                />
              ) : (
                <div data-live-field="profileAccessId">
                  <SearchProfileAccess
                    businessId={businessId}
                    searchProfileAccessInputValue={profile.name}
                    errorProfileAccessId={live.errorOf("profileAccessId")}
                    handleUpdateSearchProfileAccessInputValue={(picked) =>
                      setProfile({
                        id: picked.profileAccessId,
                        name: picked.searchProfileAccessInputValue,
                      })
                    }
                  />
                </div>
              )}
            </div>
          )}

          {isEdit && isMaster && (
            <div
              data-user-field="password-link"
              className="flex items-start gap-3 rounded-lg border p-4"
            >
              <Checkbox
                id="user-send-password-link"
                checked={sendLink}
                onCheckedChange={(checked) => setSendLink(checked === true)}
              />
              <div className="space-y-1">
                <Label
                  htmlFor="user-send-password-link"
                  className="text-sm font-medium"
                >
                  Enviar link de redefinição de senha
                </Label>
                <p className="text-xs text-muted-foreground">
                  O usuário recebe por e-mail um link de uso único, válido por
                  24 horas, para definir uma nova senha. A senha atual continua
                  valendo até ele usar o link. Nenhuma senha é enviada por
                  e-mail.
                </p>
              </div>
            </div>
          )}

          {endsSessions && (
            <div
              role="status"
              className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Ao salvar, as sessões deste usuário serão encerradas (na web e
                no aplicativo) e as notificações dele serão apagadas: mudar o
                nível de acesso ou o motorista vinculado exige entrar de novo. O
                registro de atividades é mantido.
              </p>
            </div>
          )}

          <SubmitRow isEdit={isEdit} canSubmit={canSubmit} onCancel={onClose} />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { UserFormDialog };
