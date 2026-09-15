"use client";

import { useState } from "react";
import { toast } from "sonner";

import { AlertTriangle, Check, Copy, KeyRound, Loader } from "lucide-react";

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

import { createApiKey, type ApiScope } from "@/actions/integration";

interface ApiKeyDialogProps {
  businessId: string;
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

/**
 * Read and write are separate scopes on purpose.
 *
 * Granting write to a system that only posts documents is how somebody finds
 * out, after a leak, that it could also read the entire operation — so the
 * form makes the pair a deliberate choice rather than one checkbox called
 * "entregas".
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
    hint: "Criar e atualizar documentos. Não concede leitura.",
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
}: ApiKeyDialogProps): JSX.Element => {
  const [name, setName] = useState<string>("");
  const [scopes, setScopes] = useState<ApiScope[]>(["deliveries:read"]);

  const [rateLimit, setRateLimit] = useState<string>("120");

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  /** Held in memory only, and only until this dialog closes. */
  const [issued, setIssued] = useState<{ prefix: string; token: string } | null>(
    null,
  );

  const toggleScope = (scope: ApiScope) => {
    setScopes((current) =>
      current.includes(scope)
        ? current.filter((entry) => entry !== scope)
        : [...current, scope],
    );
  };

  const handleCreate = async () => {
    if (name.trim().length < 2) {
      toast.error("Dê um nome à chave — quem revoga precisa reconhecer qual é.");
      return;
    }

    if (scopes.length === 0) {
      toast.error("Escolha ao menos um escopo.");
      return;
    }

    setIsSaving(true);

    try {
      const result = await createApiKey(businessId, {
        name: name.trim(),
        scopes,
        rate_limit_per_minute: Number(rateLimit) || 120,
      });

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

  const handleCopy = async () => {
    if (!issued) return;

    try {
      await navigator.clipboard.writeText(issued.token);

      setCopied(true);
      toast.success("Chave copiada.");
    } catch (error) {
      // Clipboard is blocked on insecure origins and in some browsers; the
      // token is on screen and selectable, so this is a convenience failing,
      // not the flow failing.
      toast.error("Não foi possível copiar. Selecione o texto e copie à mão.");
    }
  };

  const handleClose = () => {
    setName("");
    setScopes(["deliveries:read"]);

    setRateLimit("120");
    setIssued(null);
    setCopied(false);

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogScrollContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            {issued ? "Chave emitida" : "Nova chave de API"}
          </DialogTitle>

          <DialogDescription>
            {issued
              ? "Copie agora. Esta é a única vez que a chave aparece."
              : "Uma chave por sistema integrado. Revogar uma não afeta as outras."}
          </DialogDescription>
        </DialogHeader>

        {issued ? (
          <div className="space-y-4">
            <div
              className="flex items-start gap-3 rounded-lg border
              border-amber-500/40 bg-amber-500/10 p-3"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />

              <p className="text-sm text-amber-900 dark:text-amber-200">
                Não guardamos o segredo. Se esta janela fechar sem que a chave
                seja copiada, o caminho é emitir outra e revogar esta.
              </p>
            </div>

            <div className="grid gap-2">
              <Label>Chave</Label>

              <div className="flex items-center gap-2">
                <code
                  className="flex-1 break-all rounded-md border bg-muted
                  px-3 py-2 font-mono text-xs"
                >
                  {issued.token}
                </code>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  aria-label="Copiar a chave"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Envie no cabeçalho <code>Authorization: Bearer …</code>. O
                prefixo <code>{issued.prefix}</code> é o que aparece na lista.
              </p>
            </div>

            <div className="flex justify-end">
              <Button type="button" onClick={handleClose}>
                Já copiei
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="api-key-name">Nome</Label>

              <Input
                id="api-key-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                placeholder="ERP Protheus"
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label>Escopos</Label>

              <div className="space-y-2">
                {SCOPE_OPTIONS.map((option) => (
                  <label
                    key={option.scope}
                    className="flex cursor-pointer items-start gap-3
                    rounded-md border p-3 hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4"
                      checked={scopes.includes(option.scope)}
                      onChange={() => toggleScope(option.scope)}
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
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="api-key-rate">Limite por minuto</Label>

              <Input
                id="api-key-rate"
                type="number"
                min={10}
                max={6000}
                value={rateLimit}
                onChange={(event) => setRateLimit(event.target.value)}
                disabled={isSaving}
              />

              <p className="text-xs text-muted-foreground">
                Por chave, não por empresa: uma integração em laço não gasta o
                orçamento da outra.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSaving}
              >
                Cancelar
              </Button>

              <Button type="button" onClick={handleCreate} disabled={isSaving}>
                {isSaving && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                Emitir chave
              </Button>
            </div>
          </div>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

export { ApiKeyDialog };
