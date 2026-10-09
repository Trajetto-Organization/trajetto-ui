"use client";

import { useQuery, useQueryClient } from "react-query";

import { BellRing } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { getOpsAlertSound, updateOpsAlertSound } from "@/actions/chat/tickets";

import { useChatAccess } from "../chat/lib/use-chat-unread";
import { OPS_ALERT_SOUND_KEY } from "./ops-alert-balloon";

/**
 * "Alertas da operação" in the profile (decision 14.6, design §6.5): the
 * person's own sound switch, saved on the server so it follows them across
 * browsers. "Ouvir som" plays it — and is also the interaction a browser
 * asks for before it lets a page play audio. Only for who works deliveries:
 * nobody else ever sees the balloon.
 */
const OpsAlertSoundSetting = (): JSX.Element | null => {
  const queryClient = useQueryClient();
  const { canUseChat } = useChatAccess();

  const query = useQuery(
    OPS_ALERT_SOUND_KEY,
    async () => {
      const result = await getOpsAlertSound();

      if (!result.success || !result.data) throw new Error(result.message);

      return result.data.sound;
    },
    { enabled: canUseChat, staleTime: 5 * 60_000 },
  );

  if (!canUseChat) return null;

  const sound = query.data ?? true;

  const change = async (next: boolean) => {
    queryClient.setQueryData(OPS_ALERT_SOUND_KEY, next);

    const result = await updateOpsAlertSound(next);

    if (!result.success) {
      queryClient.setQueryData(OPS_ALERT_SOUND_KEY, !next);
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
  };

  const preview = () => {
    new Audio("/sounds/notification.aac").play().catch(() => {
      toast.error(
        "O navegador bloqueou o som. Verifique as permissões de áudio do site.",
      );
    });
  };

  return (
    <div
      className="space-y-3 rounded-lg border p-3"
      data-testid="ops-alert-sound-setting"
    >
      <div className="flex items-center gap-2">
        <BellRing className="h-5 w-5 text-primary" />
        <h4 className="text-sm font-semibold">Alertas da operação</h4>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <Label htmlFor="ops-alert-sound" className="text-sm font-medium">
            Tocar som nos alertas
          </Label>
          <p className="text-xs text-muted-foreground">
            Ocorrências, pedidos de autorização e mensagens dos motoristas
            aparecem no balão do canto inferior direito. O balão aparece sempre;
            o som é opcional.
          </p>
        </div>

        <Switch
          id="ops-alert-sound"
          checked={sound}
          disabled={query.isLoading}
          onCheckedChange={(value) => void change(value)}
        />
      </div>

      <Button type="button" variant="outline" size="sm" onClick={preview}>
        Ouvir som
      </Button>
    </div>
  );
};

export { OpsAlertSoundSetting };
