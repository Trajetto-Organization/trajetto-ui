"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "react-query";

import { toast } from "sonner";

import { AlertTriangle, Check, Loader, Webhook, X } from "lucide-react";

import { cn } from "@/lib/utils";

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

import FormInput from "@/components/shared/custom/form-input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

import {
  getIntegrationCatalogue,
  saveWebhookEndpoint,
  type WebhookEndpointRow,
} from "@/actions/integration";
import { STALE_ACTION_MESSAGE, isStaleActionResult } from "@/lib/action-result";
import {
  IGNORE_BLUR_ATTRIBUTE,
  canSubmitForm,
  useLiveValidation,
} from "@/components/shared/live-validation";

import {
  familyWildcards,
  isCovered,
  isCoveredByWildcard,
  isFamilySelected,
  normalizeSubscriptions,
  partialWildcards,
  removeSubscription,
  sameSubscriptions,
  toggleFamily,
  unknownSubscriptions,
} from "../../lib/webhook-topics";
import {
  WEBHOOK_URL_MAX_LENGTH,
  validateWebhookForm,
  webhookFormSchema,
} from "../../lib/webhook-form-schema";
import {
  INTEGRATION_DOCS,
  SIGNATURE_TOLERANCE_SECONDS,
} from "../../lib/docs-links";

import { ChoiceGroupField } from "../../components/choice-group-field";
import { DocsLink } from "../../components/docs-link";
import {
  SecretReveal,
  useConfirmBeforeClosingSecret,
} from "../../components/secret-reveal";

interface WebhookFormDialogProps {
  businessId: string;
  endpoint: WebhookEndpointRow | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const FAMILY_LABELS: Record<string, string> = {
  route: "Rotas",
  document: "Documentos",
};

/** A stored subscription shown on its own, with the way to remove it. */
const SubscriptionChip = ({
  subscription,
  disabled,
  onRemove,
}: {
  subscription: string;
  disabled: boolean;
  onRemove: (subscription: string) => void;
}): JSX.Element => (
  <span className="inline-flex max-w-full items-center gap-1 rounded-md border bg-background py-0.5 pl-2 pr-0.5 font-mono text-xs">
    <span className="truncate">{subscription}</span>

    <button
      type="button"
      disabled={disabled}
      aria-label={`Remover a assinatura ${subscription}`}
      title={`Remover ${subscription}`}
      onClick={() => onRemove(subscription)}
      className="rounded p-0.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
    >
      <X className="h-3 w-3" aria-hidden="true" />
    </button>
  </span>
);

/**
 * Pointing a webhook somewhere.
 *
 * The topic list comes from the API's own catalogue rather than a copy kept
 * here: the dispatcher matches on those exact strings, and a picker that
 * drifted would offer subscriptions to events that never arrive.
 *
 * "Todos os eventos" subscribes the family's one-level wildcards, which are
 * topic PREFIXES: `route.*` for Rotas, and `delivery.*`, `occurrence.*` and
 * `proof.*` for Documentos. It used to save `document.*`, which matches no
 * topic — the endpoint received nothing and the boxes showed unchecked
 * (DLVB-22, decision 5.9). Never a bare `*`: a blanket subscription signs a
 * company up for topics that did not exist when they agreed to it.
 */
const WebhookFormDialog = ({
  businessId,
  endpoint,
  isOpen,
  onClose,
  onSaved,
}: WebhookFormDialogProps): JSX.Element => {
  // What the endpoint is subscribed to, in today's spelling: a legacy
  // `document.*` opens as the three wildcards, so the edit can be saved.
  const initialTopics = useMemo(
    () => normalizeSubscriptions(endpoint?.topics ?? []),
    [endpoint],
  );

  const [name, setName] = useState<string>(endpoint?.name ?? "");
  const [url, setUrl] = useState<string>(endpoint?.url ?? "");

  const [topics, setTopics] = useState<string[]>(initialTopics);
  const [isActive, setIsActive] = useState<boolean>(
    endpoint?.is_active ?? true,
  );

  const [isSaving, setIsSaving] = useState<boolean>(false);

  /** Only ever set on a create, and only until this dialog closes. */
  const [secret, setSecret] = useState<string | null>(null);

  const { data: catalogue, isLoading: isLoadingCatalogue } = useQuery(
    ["integration_catalogue"],
    async () => {
      const answer = await getIntegrationCatalogue();

      if (isStaleActionResult(answer, { background: true })) {
        throw new Error(STALE_ACTION_MESSAGE);
      }

      return answer;
    },
    { refetchOnWindowFocus: false, staleTime: 5 * 60 * 1000 },
  );

  const families = useMemo(() => {
    const entries = catalogue?.data?.topics ?? [];

    const grouped = new Map<string, typeof entries>();

    for (const entry of entries) {
      grouped.set(entry.family, [...(grouped.get(entry.family) ?? []), entry]);
    }

    return [...grouped.entries()].map(([family, familyEntries]) => ({
      family,
      entries: familyEntries,
      wildcards: familyWildcards(
        familyEntries[0].family,
        familyEntries,
        catalogue?.data,
      ),
    }));
  }, [catalogue]);

  /**
   * What the catalogue does not know, once it is known. Before it loads (or
   * when it failed to) every stored subscription would look unknown.
   */
  const unknown =
    families.length === 0
      ? []
      : unknownSubscriptions(
          topics,
          families.flatMap((family) =>
            family.entries.map((entry) => entry.topic),
          ),
          families.flatMap((family) => family.wildcards),
        );

  useEffect(() => {
    setName(endpoint?.name ?? "");
    setUrl(endpoint?.url ?? "");

    setTopics(initialTopics);
    setIsActive(endpoint?.is_active ?? true);

    setSecret(null);
  }, [endpoint, initialTopics, isOpen]);

  // Live validation (decision 16.700) with the form's schema, the API's
  // rules and words; subscriptions the catalogue no longer has are refused
  // by the API, so they are said under Eventos, where they can be removed.
  const live = useLiveValidation({
    schema: webhookFormSchema,
    values: { name, url, topics, is_active: isActive },
    rules: () => ({
      topics:
        unknown.length > 0
          ? "Remova as assinaturas não reconhecidas para salvar."
          : null,
    }),
    fields: ["name", "url", "topics"],
    controlIds: {
      name: "webhook-name",
      url: "webhook-url",
      topics: "webhook-topics",
    },
    resetKey: `${endpoint?.id ?? "new"}:${isOpen}`,
    // Not a <form>: Salvar calls validate() itself.
    validateOnSubmit: false,
  });

  /**
   * Salvar only when there is something to save (decision 2.5). Saving an
   * untouched form used to be the only way to switch a tripped breaker back
   * on; that is now the panel's "Reativar envios" (CRIT-24).
   */
  const isPristine =
    endpoint !== null &&
    name.trim() === endpoint.name &&
    url.trim() === endpoint.url &&
    isActive === endpoint.is_active &&
    sameSubscriptions(topics, endpoint.topics);

  // A box ticked, a family toggled or a chip removed is a complete answer.
  const toggleTopic = (topic: string, checked: boolean) => {
    live.touch("topics");

    setTopics((current) =>
      checked
        ? [...current.filter((entry) => entry !== topic), topic]
        : current.filter((entry) => entry !== topic),
    );
  };

  const handleToggleFamily = (wildcards: string[], familyTopics: string[]) => {
    live.touch("topics");
    setTopics((current) => toggleFamily(current, wildcards, familyTopics));
  };

  const handleRemoveSubscription = (subscription: string) => {
    live.touch("topics");
    setTopics((current) => removeSubscription(current, subscription));
  };

  const handleSave = async () => {
    if (!live.validate()) return;

    const checked = validateWebhookForm({
      name,
      url,
      topics,
      is_active: isActive,
    });

    if (checked.errors) return;

    setIsSaving(true);

    try {
      const result = await saveWebhookEndpoint(
        businessId,
        checked.values,
        endpoint?.id,
      );

      if (isStaleActionResult(result)) return;

      // The API's refusals are shown verbatim — the ten-endpoint ceiling, a
      // name that resolves inside our network. The fields above already
      // said everything a person can fix by typing.
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      onSaved();

      if (result.data?.secret) {
        setSecret(result.data.secret);
        return;
      }

      toast.success(result.message);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const { handleOpenChange, guard, markCopied } = useConfirmBeforeClosingSecret(
    {
      isRevealing: Boolean(secret),
      onClose,
      what: "o segredo",
    },
  );

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !isSaving && handleOpenChange(open)}
    >
      <DialogScrollContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" aria-hidden="true" />
            {secret
              ? "Endpoint criado"
              : endpoint
                ? "Editar endpoint"
                : "Novo endpoint"}
          </DialogTitle>

          <DialogDescription>
            {secret
              ? "Guarde o segredo agora. É com ele que o seu sistema confere a assinatura."
              : "Enviamos um POST assinado para esta URL a cada evento assinado."}
          </DialogDescription>
        </DialogHeader>

        {secret ? (
          <SecretReveal
            value={secret}
            label="o segredo"
            fieldLabel="Segredo de assinatura"
            successMessage="Segredo copiado."
            warning={
              <>
                Esta é a única vez que o segredo aparece. Editar o endpoint
                depois não gera outro; para trocá-lo, use &ldquo;Gerar novo
                segredo&rdquo; na lista — o atual continua valendo por 24 horas.
              </>
            }
            hint={
              <>
                O cabeçalho <code>X-Trajetto-Signature</code> traz{" "}
                <code>t=&lt;timestamp&gt;,v1=&lt;hex&gt;</code>. Calcule o HMAC
                SHA-256 de <code>timestamp.corpo</code> usando como chave o
                segredo INTEIRO, com o prefixo <code>whsec_</code>, e compare em
                tempo constante. Use o corpo cru, exatamente como chegou (antes
                de qualquer <code>JSON.parse</code>), e recuse a chamada se o{" "}
                <code>t</code> estiver a mais de {SIGNATURE_TOLERANCE_SECONDS}{" "}
                segundos do seu relógio.{" "}
                <DocsLink href={INTEGRATION_DOCS.signature}>
                  Como verificar a assinatura
                </DocsLink>
              </>
            }
            doneLabel="Já guardei"
            onDone={onClose}
            onCopied={markCopied}
          />
        ) : (
          <div ref={live.ref} className="space-y-4">
            <FormInput
              label="Nome *"
              htmlfor="webhook-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              placeholder="ERP do embarcador"
              errorName={live.errorOf("name")}
              disabled={isSaving}
            />

            <FormInput
              label="URL *"
              htmlfor="webhook-url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              maxLength={WEBHOOK_URL_MAX_LENGTH}
              placeholder="https://erp.exemplo.com.br/trajetto/webhook"
              errorName={live.errorOf("url")}
              hint="Só https, alcançável pela internet. A assinatura prova a origem; ela não protege o conteúdo de quem estiver no caminho."
              disabled={isSaving}
            />

            <ChoiceGroupField
              id="webhook-topics"
              label="Eventos *"
              error={live.messageOf("topics")}
            >
              {isLoadingCatalogue ? (
                <div className="space-y-2">
                  <Skeleton className="h-20 w-full rounded-md" />
                  <Skeleton className="h-20 w-full rounded-md" />
                </div>
              ) : (
                // One field: moving between the boxes is not leaving it.
                <div className="space-y-4" data-live-field="topics">
                  {families.map(({ family, entries, wildcards }) => {
                    const selected = isFamilySelected(topics, wildcards);
                    const partial = partialWildcards(topics, wildcards);

                    return (
                      <div key={family} className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {FAMILY_LABELS[family] ?? family}
                          </p>

                          <button
                            type="button"
                            disabled={isSaving}
                            aria-pressed={selected}
                            title={`Assina ${wildcards.join(", ")}: inclui os eventos que a família ganhar depois.`}
                            onClick={() =>
                              handleToggleFamily(
                                wildcards,
                                entries.map((entry) => entry.topic),
                              )
                            }
                            className={cn(
                              `flex items-center gap-2 rounded-md border px-2 py-1
                               text-[11px] hover:bg-muted disabled:opacity-50`,
                              selected &&
                                `border-primary bg-primary/10 text-primary
                                 hover:bg-primary/15`,
                            )}
                          >
                            {selected && (
                              <Check className="h-3 w-3" aria-hidden="true" />
                            )}

                            <span>Todos os eventos</span>
                            <span className="font-mono">
                              {wildcards.join(" ")}
                            </span>
                          </button>
                        </div>

                        {/*
                          A prefix held without the rest of the family (only
                          delivery.*): its topics are locked below, so the
                          prefix gets its own entry to be removed from.
                        */}
                        {partial.length > 0 && (
                          <div
                            className="space-y-1.5 rounded-md border border-dashed p-2.5"
                            data-partial-wildcards={family}
                          >
                            <div className="flex flex-wrap gap-2">
                              {partial.map((wildcard) => (
                                <SubscriptionChip
                                  key={wildcard}
                                  subscription={wildcard}
                                  disabled={isSaving}
                                  onRemove={handleRemoveSubscription}
                                />
                              ))}
                            </div>

                            <p className="text-xs text-muted-foreground">
                              Assinatura por prefixo: recebe todos os eventos
                              que começam assim, inclusive os que surgirem
                              depois. Remova-a para escolher evento por evento.
                            </p>
                          </div>
                        )}

                        <div className="space-y-1.5">
                          {entries.map((entry) => {
                            // Covered by a wildcard: shown as chosen, because
                            // it IS, and locked, because unchecking one of
                            // them cannot mean anything while the wildcard
                            // subscribes to all of them.
                            const byWildcard = isCoveredByWildcard(
                              topics,
                              entry.topic,
                            );

                            const id = `webhook-topic-${entry.topic.replace(/\W/g, "-")}`;

                            return (
                              <label
                                key={entry.topic}
                                htmlFor={id}
                                className={cn(
                                  `flex items-start gap-3 rounded-md border p-2.5`,
                                  byWildcard
                                    ? "cursor-default bg-muted/40"
                                    : "cursor-pointer hover:bg-muted/50",
                                )}
                              >
                                <Checkbox
                                  id={id}
                                  value={entry.topic}
                                  className="mt-0.5"
                                  checked={isCovered(topics, entry.topic)}
                                  onCheckedChange={(checked) =>
                                    toggleTopic(entry.topic, checked === true)
                                  }
                                  disabled={isSaving || byWildcard}
                                />

                                <span className="space-y-0.5">
                                  <span className="block font-mono text-xs font-medium">
                                    {entry.topic}
                                  </span>

                                  <span className="block text-xs text-muted-foreground">
                                    {entry.description}
                                  </span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {unknown.length > 0 && (
                    <div
                      className="space-y-2 rounded-md border border-amber-500/50 bg-amber-500/5 p-2.5"
                      data-unknown-subscriptions=""
                    >
                      <p className="flex items-center gap-2 text-xs font-medium">
                        <AlertTriangle
                          className="h-3.5 w-3.5 shrink-0 text-amber-600"
                          aria-hidden="true"
                        />
                        Assinaturas não reconhecidas
                      </p>

                      <p className="text-xs text-muted-foreground">
                        Estes eventos não existem mais no catálogo e não recebem
                        nada. A API não aceita salvá-los: remova-os para salvar.
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {unknown.map((subscription) => (
                          <SubscriptionChip
                            key={subscription}
                            subscription={subscription}
                            disabled={isSaving}
                            onRemove={handleRemoveSubscription}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ChoiceGroupField>

            <div className="flex items-start justify-between gap-4 rounded-md border p-3">
              <div className="space-y-1">
                <Label htmlFor="webhook-active">Ativo</Label>

                {/*
                  What the switch really does (DLVB-25): pausing is
                  unsubscribing. The fan-out writes nothing for a paused
                  endpoint, so the events of the pause are gone; only what
                  was already queued waits for it.
                */}
                <p
                  id="webhook-active-hint"
                  className="text-xs text-muted-foreground"
                >
                  Desligado, o endpoint fica pausado: eventos que acontecerem
                  com ele pausado não são enviados depois. O que já estava na
                  fila fica retido e sai quando você religar (até 30 dias). O
                  histórico de envios é mantido.
                </p>
              </div>

              <Switch
                id="webhook-active"
                aria-describedby="webhook-active-hint"
                checked={isActive}
                onCheckedChange={setIsActive}
                disabled={isSaving}
              />
            </div>

            <DialogFormFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSaving}
                {...{ [IGNORE_BLUR_ATTRIBUTE]: "" }}
              >
                Cancelar
              </Button>

              <Button
                type="button"
                onClick={handleSave}
                disabled={
                  isSaving ||
                  !canSubmitForm({
                    isEdit: endpoint !== null,
                    isDirty: !isPristine,
                  })
                }
                title={isPristine ? "Nada foi alterado." : undefined}
              >
                {isSaving && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                {endpoint ? "Salvar" : "Criar endpoint"}
              </Button>
            </DialogFormFooter>
          </div>
        )}
      </DialogScrollContent>

      {guard}
    </Dialog>
  );
};

export { WebhookFormDialog };
