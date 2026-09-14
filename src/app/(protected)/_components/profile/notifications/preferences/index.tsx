"use client";

import { useState } from "react";

import { BellRing, Info } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

import { Alert, AlertDescription } from "@/components/ui/alert";

import {
  updateNotificationPreferences,
  type NotificationPreferenceRow,
} from "@/actions/notifications";

/**
 * The single screen the plan promised: what each category may do on each
 * channel. Saving writes explicit rows — until then the legacy global
 * toggles decide, which is why untouched categories show their values.
 */

const CATEGORY_COPY: Record<
  NotificationPreferenceRow["category"],
  { label: string; description: string }
> = {
  FINES: {
    label: "Multas",
    description: "Novas multas registradas para a empresa.",
  },
  MAINTENANCE: {
    label: "Ordens de serviço",
    description: "Ordens designadas a você ou atualizadas.",
  },
  FINANCE: {
    label: "Contas a pagar",
    description: "Contas designadas a você ou atualizadas.",
  },
  TASKS: {
    label: "Kanban",
    description: "Cards atribuídos a você no quadro.",
  },
  ACCOUNT: {
    label: "Conta",
    description: "Alterações na sua conta e avisos administrativos.",
  },
};

interface NotificationPreferencesProps {
  initialPreferences: NotificationPreferenceRow[] | null;
}

const channelsSnapshot = (rows: NotificationPreferenceRow[]): string =>
  rows
    .map((row) => `${row.category}:${row.inApp}${row.email}${row.whatsapp}`)
    .join("|");

const NotificationPreferences = ({
  initialPreferences,
}: NotificationPreferencesProps): JSX.Element => {
  const [rows, setRows] = useState<NotificationPreferenceRow[]>(
    initialPreferences ?? [],
  );

  // Dirty means "different from the last saved state", not "was touched":
  // toggling something and toggling it back re-disables the button.
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    channelsSnapshot(initialPreferences ?? []),
  );

  const [isSaving, setIsSaving] = useState(false);
  const isDirty = channelsSnapshot(rows) !== savedSnapshot;

  if (!initialPreferences) {
    return (
      <div className="text-center text-muted-foreground">
        Erro ao carregar as preferências de notificação.
      </div>
    );
  }

  const toggle = (
    category: NotificationPreferenceRow["category"],
    channel: "inApp" | "email" | "whatsapp",
    value: boolean,
  ) => {
    setRows((current) =>
      current.map((row) =>
        row.category === category ? { ...row, [channel]: value } : row,
      ),
    );
  };

  const save = async () => {
    if (isSaving || !isDirty) return;
    setIsSaving(true);

    try {
      const result = await updateNotificationPreferences(
        rows.map(({ category, inApp, email, whatsapp }) => ({
          category,
          inApp,
          email,
          whatsapp,
        })),
      );

      if (result.successMessage) {
        toast.success(result.successMessage);
        setSavedSnapshot(channelsSnapshot(rows));
      } else if (result.updateError) {
        toast.error(result.updateError);
      }
    } catch {
      toast.error("Erro inesperado ao salvar as preferências.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BellRing className="h-7 w-7 text-primary" />
        <div>
          <h3 className="text-lg font-semibold">
            Preferências de notificação
          </h3>
          <p className="text-sm text-muted-foreground">
            Escolha o que chega, e por onde, em cada categoria
          </p>
        </div>
      </div>

      <Separator />

      {/* Column headers */}
      <div
        className="hidden sm:grid grid-cols-[1fr_repeat(3,4.5rem)]
        gap-2 px-1 text-xs font-medium text-muted-foreground"
      >
        <span />
        <span className="text-center">App</span>
        <span className="text-center">E-mail</span>
        <span className="text-center">WhatsApp</span>
      </div>

      <div className="space-y-4">
        {rows.map((row) => {
          const copy = CATEGORY_COPY[row.category];

          return (
            <div
              key={row.category}
              className="grid grid-cols-1 sm:grid-cols-[1fr_repeat(3,4.5rem)]
              items-center gap-2 rounded-lg border p-3"
            >
              <div className="min-w-0">
                <Label className="text-sm font-medium">{copy.label}</Label>
                <p className="text-xs text-muted-foreground">
                  {copy.description}
                </p>
              </div>

              <div className="flex items-center justify-between sm:justify-center gap-2">
                <span className="text-xs text-muted-foreground sm:hidden">
                  App
                </span>
                <Switch
                  checked={row.inApp}
                  onCheckedChange={(value) =>
                    toggle(row.category, "inApp", value)
                  }
                  aria-label={`${copy.label} no app`}
                />
              </div>

              <div className="flex items-center justify-between sm:justify-center gap-2">
                <span className="text-xs text-muted-foreground sm:hidden">
                  E-mail
                </span>
                <Switch
                  checked={row.email}
                  onCheckedChange={(value) =>
                    toggle(row.category, "email", value)
                  }
                  aria-label={`${copy.label} por e-mail`}
                />
              </div>

              <div className="flex items-center justify-between sm:justify-center gap-2">
                <span className="text-xs text-muted-foreground sm:hidden">
                  WhatsApp
                </span>
                <Switch
                  checked={row.whatsapp}
                  onCheckedChange={(value) =>
                    toggle(row.category, "whatsapp", value)
                  }
                  aria-label={`${copy.label} por WhatsApp`}
                />
              </div>
            </div>
          );
        })}
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Avisos críticos sobre a sua conta são sempre entregues no app,
          independentemente destas escolhas. WhatsApp exige um número
          configurado na seção abaixo.
        </AlertDescription>
      </Alert>

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={() => void save()}
          disabled={!isDirty || isSaving}
        >
          {isSaving ? "Salvando..." : "Salvar preferências"}
        </Button>
      </div>
    </div>
  );
};

export { NotificationPreferences };
