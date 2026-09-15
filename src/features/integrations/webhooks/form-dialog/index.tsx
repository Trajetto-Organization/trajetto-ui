"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "react-query";

import { toast } from "sonner";

import { AlertTriangle, Check, Copy, Loader, Webhook } from "lucide-react";

import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogScrollContent,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

import {
  getIntegrationCatalogue,
  saveWebhookEndpoint,
  type WebhookEndpointRow,
} from "@/actions/integration";

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

/**
 * Pointing a webhook somewhere.
 *
 * The topic list comes from the API's own catalogue rather than a copy kept
 * here: the dispatcher matches on those exact strings, and a picker that
 * drifted would offer subscriptions to events that never arrive.
 *
 * The wildcard offered is one level (`delivery.*`) and never a bare `*` — the
 * API refuses that, and for a reason worth repeating on screen: a blanket
 * subscription signs a company up for topics that did not exist when they
 * agreed to it.
 */
const WebhookFormDialog = ({
  businessId,
  endpoint,
  isOpen,
  onClose,
  onSaved,
}: WebhookFormDialogProps): JSX.Element => {
  const [name, setName] = useState<string>(endpoint?.name ?? "");
  const [url, setUrl] = useState<string>(endpoint?.url ?? "");

  const [topics, setTopics] = useState<string[]>(endpoint?.topics ?? []);
  const [isActive, setIsActive] = useState<boolean>(endpoint?.is_active ?? true);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  /** Only ever set on a create, and only until this dialog closes. */
  const [secret, setSecret] = useState<string | null>(null);

  const { data: catalogue, isLoading: isLoadingCatalogue } = useQuery(
    ["integration_catalogue"],
    () => getIntegrationCatalogue(),
    { refetchOnWindowFocus: false, staleTime: 5 * 60 * 1000 },
  );

  const families = useMemo(() => {
    const entries = catalogue?.data?.topics ?? [];

    const grouped = new Map<string, typeof entries>();

    for (const entry of entries) {
      grouped.set(entry.family, [...(grouped.get(entry.family) ?? []), entry]);
    }

    return [...grouped.entries()];
  }, [catalogue]);

  useEffect(() => {
    setName(endpoint?.name ?? "");
    setUrl(endpoint?.url ?? "");

    setTopics(endpoint?.topics ?? []);
    setIsActive(endpoint?.is_active ?? true);

    setSecret(null);
    setCopied(false);
  }, [endpoint, isOpen]);

  const toggleTopic = (topic: string) => {
    setTopics((current) =>
      current.includes(topic)
        ? current.filter((entry) => entry !== topic)
        : [...current, topic],
    );
  };

  const handleSave = async () => {
    if (name.trim().length < 2) {
      toast.error("Dê um nome ao endpoint.");
      return;
    }

    if (topics.length === 0) {
      toast.error("Escolha ao menos um tópico.");
      return;
    }

    setIsSaving(true);

    try {
      const result = await saveWebhookEndpoint(
        businessId,
        {
          name: name.trim(),
          url: url.trim(),
          topics,
          is_active: isActive,
        },
        endpoint?.id,
      );

      // The API's refusals are shown verbatim — http instead of https, a
      // topic that is not in the catalogue. Re-implementing those checks here
      // would be a second copy of the rules, free to drift from the one that
      // actually decides.
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

  const handleCopy = async () => {
    if (!secret) return;

    try {
      await navigator.clipboard.writeText(secret);

      setCopied(true);
      toast.success("Segredo copiado.");
    } catch (error) {
      toast.error("Não foi possível copiar. Selecione o texto e copie à mão.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogScrollContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
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
          <div className="space-y-4">
            <div
              className="flex items-start gap-3 rounded-lg border
              border-amber-500/40 bg-amber-500/10 p-3"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />

              <p className="text-sm text-amber-900 dark:text-amber-200">
                Esta é a única vez que o segredo aparece. Editar o endpoint
                depois não gera outro — trocá-lo quebraria a verificação do seu
                sistema sem aviso.
              </p>
            </div>

            <div className="grid gap-2">
              <Label>Segredo de assinatura</Label>

              <div className="flex items-center gap-2">
                <code
                  className="flex-1 break-all rounded-md border bg-muted
                  px-3 py-2 font-mono text-xs"
                >
                  {secret}
                </code>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  aria-label="Copiar o segredo"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                O cabeçalho <code>X-Trajetto-Signature</code> traz{" "}
                <code>t=&lt;timestamp&gt;,v1=&lt;hex&gt;</code>. Calcule o HMAC
                SHA-256 sobre <code>timestamp.corpo</code> e compare em tempo
                constante.
              </p>
            </div>

            <div className="flex justify-end">
              <Button type="button" onClick={onClose}>
                Já guardei
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="webhook-name">Nome</Label>

              <Input
                id="webhook-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                placeholder="ERP do embarcador"
                disabled={isSaving}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="webhook-url">URL</Label>

              <Input
                id="webhook-url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://erp.exemplo.com.br/trajetto/webhook"
                disabled={isSaving}
              />

              <p className="text-xs text-muted-foreground">
                Só https. A assinatura prova a origem; ela não protege o
                conteúdo de quem estiver no caminho.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Eventos</Label>

              {isLoadingCatalogue ? (
                <div className="space-y-2">
                  <Skeleton className="h-20 w-full rounded-md" />
                  <Skeleton className="h-20 w-full rounded-md" />
                </div>
              ) : (
                <div className="space-y-4">
                  {families.map(([family, entries]) => (
                    <div key={family} className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {FAMILY_LABELS[family] ?? family}
                        </p>

                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => toggleTopic(`${family}.*`)}
                          className="rounded-md border px-2 py-1 font-mono
                          text-[11px] hover:bg-muted disabled:opacity-50"
                        >
                          {topics.includes(`${family}.*`) ? "✓ " : ""}
                          {family}.*
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        {entries.map((entry) => (
                          <label
                            key={entry.topic}
                            className="flex cursor-pointer items-start gap-3
                            rounded-md border p-2.5 hover:bg-muted/50"
                          >
                            <input
                              type="checkbox"
                              className="mt-1 h-4 w-4"
                              checked={topics.includes(entry.topic)}
                              onChange={() => toggleTopic(entry.topic)}
                              disabled={isSaving}
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
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="webhook-active">Ativo</Label>

                <p className="text-xs text-muted-foreground">
                  Desligar aqui para de enviar sem apagar o histórico.
                </p>
              </div>

              <Switch
                id="webhook-active"
                checked={isActive}
                onCheckedChange={setIsActive}
                disabled={isSaving}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSaving}
              >
                Cancelar
              </Button>

              <Button type="button" onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                {endpoint ? "Salvar" : "Criar endpoint"}
              </Button>
            </div>
          </div>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

export { WebhookFormDialog };
