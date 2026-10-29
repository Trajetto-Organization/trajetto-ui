"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { KeyRound, Loader } from "lucide-react";

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

import FormInput from "@/components/shared/custom/form-input";

import { createApiKey, type ApiScope } from "@/actions/integration";
import { isStaleActionResult } from "@/lib/action-result";
import {
  IGNORE_BLUR_ATTRIBUTE,
  useLiveValidation,
} from "@/components/shared/live-validation";

import {
  TENANT_API_KEY_RATE_CEILING,
  apiKeyRateCeiling,
  type IntegrationsMode,
} from "../../lib/api-key-limits";
import {
  API_KEY_RATE_MAX_DIGITS,
  DEFAULT_API_KEY_RATE,
  apiKeyFormSchema,
  digitsOnly,
  validateApiKeyForm,
} from "../../lib/api-key-form-schema";
import { INTEGRATION_DOCS } from "../../lib/docs-links";

import { ChoiceGroupField } from "../../components/choice-group-field";
import { DocsLink } from "../../components/docs-link";
import {
  SecretReveal,
  useConfirmBeforeClosingSecret,
} from "../../components/secret-reveal";

interface ApiKeyDialogProps {
  businessId: string;
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;

  /** Whose screen this is: it decides the per-key ceiling on offer. */
  mode: IntegrationsMode;
}

/**
 * One checkbox per scope, never one called "entregas".
 *
 * Read and write are separate scopes on purpose: granting write to a system
 * that only posts documents is how somebody finds out, after a leak, that it
 * could also read the entire operation.
 *
 * `deliveries:write` is offered now that POST /integration/v1/deliveries
 * exists (decision 5.10); before, customers created write keys for an ERP
 * push with nothing to push to. `webhooks:manage` guards no route and stays
 * reserved, so it is not offered — the API refuses it at issue anyway.
 */
const SCOPE_OPTIONS: Array<{
  scope: ApiScope;
  label: string;
  hint: string;
}> = [
  {
    scope: "deliveries:read",
    label: "Entregas — leitura",
    hint: "Consultar documentos, status e comprovantes.",
  },
  {
    scope: "deliveries:write",
    label: "Entregas — escrita",
    hint: "Criar entregas pelo seu ERP, com Idempotency-Key. Não inclui a leitura.",
  },
  {
    scope: "routes:read",
    label: "Rotas — leitura",
    hint: "Consultar rotas, paradas e motoristas designados.",
  },
  {
    scope: "events:read",
    label: "Eventos — leitura",
    hint: "Ler o histórico de eventos para reconciliar.",
  },
];

const ApiKeyDialog = ({
  businessId,
  isOpen,
  onClose,
  onCreated,
  mode,
}: ApiKeyDialogProps): JSX.Element => {
  const maxRatePerMinute = apiKeyRateCeiling(mode);

  const [name, setName] = useState<string>("");
  const [scopes, setScopes] = useState<ApiScope[]>(["deliveries:read"]);

  // Text, not a number: the field keeps digits only, and empty is a real
  // answer (the default) rather than a silent 120 standing in for "--".
  const [rateLimit, setRateLimit] = useState<string>("");

  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Live validation (decision 16.700) with the form's schema, the API's
  // rules and words.
  const schema = useMemo(() => apiKeyFormSchema(mode), [mode]);
  const live = useLiveValidation({
    schema,
    values: { name, scopes, rate_limit_per_minute: rateLimit },
    fields: ["name", "scopes", "rate_limit_per_minute"],
    controlIds: {
      name: "api-key-name",
      scopes: "api-key-scopes",
      rate_limit_per_minute: "api-key-rate",
    },
    // Not a <form>: Emitir chave calls validate() itself.
    validateOnSubmit: false,
  });

  /** Held in memory only, and only until this dialog closes. */
  const [issued, setIssued] = useState<{
    prefix: string;
    token: string;
  } | null>(null);

  const toggleScope = (scope: ApiScope, checked: boolean) => {
    // A box ticked or cleared is a complete answer.
    live.touch("scopes");

    setScopes((current) =>
      checked
        ? [...current.filter((entry) => entry !== scope), scope]
        : current.filter((entry) => entry !== scope),
    );
  };

  const handleCreate = async () => {
    if (!live.validate()) return;

    const checked = validateApiKeyForm(
      { name, scopes, rate_limit_per_minute: rateLimit },
      mode,
    );

    if (checked.errors) return;

    setIsSaving(true);

    try {
      const result = await createApiKey(businessId, checked.values);

      if (isStaleActionResult(result)) return;

      // The API's refusals (the plan's ceiling, ten active keys) are
      // sentences about the whole request, not one field.
      if (!result.success || !result.data) {
        toast.error(result.message);
        return;
      }

      setIssued({ prefix: result.data.prefix, token: result.data.token });
      onCreated();
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setName("");
    setScopes(["deliveries:read"]);

    setRateLimit("");
    live.reset();
    setIssued(null);

    onClose();
  };

  const { handleOpenChange, guard, markCopied } = useConfirmBeforeClosingSecret(
    {
      isRevealing: Boolean(issued),
      onClose: handleClose,
      what: "a chave",
    },
  );

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !isSaving && handleOpenChange(open)}
    >
      <DialogScrollContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" aria-hidden="true" />
            {issued ? "Chave emitida" : "Nova chave de API"}
          </DialogTitle>

          <DialogDescription>
            {issued
              ? "Copie agora. Esta é a única vez que a chave aparece."
              : "Uma chave por sistema integrado. Revogar uma não afeta as outras."}
          </DialogDescription>
        </DialogHeader>

        {issued ? (
          <SecretReveal
            value={issued.token}
            label="a chave"
            fieldLabel="Chave"
            successMessage="Chave copiada."
            warning="Não guardamos o segredo. Se esta janela fechar sem que a chave seja copiada, o caminho é emitir outra e revogar esta."
            hint={
              <>
                Envie no cabeçalho <code>Authorization: Bearer …</code>. O
                prefixo <code>{issued.prefix}</code> é o que aparece na lista.{" "}
                <DocsLink href={INTEGRATION_DOCS.authentication}>
                  Como autenticar e escopos
                </DocsLink>
              </>
            }
            doneLabel="Já copiei"
            onDone={handleClose}
            onCopied={markCopied}
          />
        ) : (
          <div ref={live.ref} className="space-y-4">
            <FormInput
              label="Nome *"
              htmlfor="api-key-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              placeholder="ERP Protheus"
              errorName={live.errorOf("name")}
              disabled={isSaving}
            />

            <ChoiceGroupField
              id="api-key-scopes"
              label="Escopos *"
              error={live.messageOf("scopes")}
            >
              {/* One field: moving between the boxes is not leaving it. */}
              <div className="space-y-2" data-live-field="scopes">
                {SCOPE_OPTIONS.map((option) => {
                  const id = `api-key-scope-${option.scope.replace(":", "-")}`;

                  return (
                    <label
                      key={option.scope}
                      htmlFor={id}
                      className="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-muted/50"
                    >
                      <Checkbox
                        id={id}
                        value={option.scope}
                        className="mt-0.5"
                        checked={scopes.includes(option.scope)}
                        onCheckedChange={(checked) =>
                          toggleScope(option.scope, checked === true)
                        }
                        disabled={isSaving}
                      />

                      <span className="space-y-0.5">
                        <span className="block text-sm font-medium">
                          {option.label}
                        </span>

                        <span className="block text-xs text-muted-foreground">
                          {option.hint}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </ChoiceGroupField>

            <FormInput
              label="Limite por minuto (opcional)"
              htmlfor="api-key-rate"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              maxLength={API_KEY_RATE_MAX_DIGITS}
              value={rateLimit}
              placeholder={String(DEFAULT_API_KEY_RATE)}
              onChange={(event) => setRateLimit(digitsOnly(event.target.value))}
              errorName={live.errorOf("rate_limit_per_minute")}
              hint={
                <>
                  Vazio: {DEFAULT_API_KEY_RATE} por minuto. De 10 a{" "}
                  {maxRatePerMinute.toLocaleString("pt-BR")} por chave
                  {mode === "admin"
                    ? ` (acima de ${TENANT_API_KEY_RATE_CEILING.toLocaleString("pt-BR")}, só o suporte da plataforma define)`
                    : "; acima disso, fale com o suporte"}
                  . As chaves da empresa dividem ainda um teto somado por
                  minuto.
                </>
              }
              disabled={isSaving}
            />

            <DialogFormFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSaving}
                {...{ [IGNORE_BLUR_ATTRIBUTE]: "" }}
              >
                Cancelar
              </Button>

              <Button type="button" onClick={handleCreate} disabled={isSaving}>
                {isSaving && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                Emitir chave
              </Button>
            </DialogFormFooter>
          </div>
        )}
      </DialogScrollContent>

      {guard}
    </Dialog>
  );
};

export { ApiKeyDialog };
