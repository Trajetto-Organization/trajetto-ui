"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "react-query";

import { BellRing, Volume2, VolumeX, X } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

import { getSocket, initializeSocket, onRealtimeResync } from "@/socket";
import { useAuthStore } from "@/store/auth-store";

import { getOpsAlertSound, updateOpsAlertSound } from "@/actions/chat/tickets";
import type {
  SentChatMessage,
  SupportTicketRealtimeEvent,
} from "@/actions/chat/chat.types";

import { useChatAccess, useTicketsSummary } from "../chat/lib/use-chat-unread";
import { buildTicketSearchParams } from "../chat/lib/chat-link";

import {
  acceptsVersion,
  cardForMessage,
  cardForTicketEvent,
  clearsCards,
  dropTicketCards,
  liveCards,
  pushCard,
  summaryPill,
  visibleCards,
  type AlertCard,
} from "./rules";
import {
  alertSoundAction,
  browserUserActivation,
  electSoundLeader,
  type LockManagerLike,
  type SoundLeader,
} from "./sound-leader";
import { getOpenTicketId } from "./open-ticket";

/** Dismissals and closes travel between the tabs of this browser. */
const ALERT_CHANNEL = "trajetto-ops-alert";

/** react-query key of the person's sound switch (decision 14.6). */
const OPS_ALERT_SOUND_KEY = ["ops-alert-sound"];

const TONE_CLASSES: Record<AlertCard["tone"], string> = {
  authorization:
    "border-red-300 bg-red-50 text-red-950 dark:border-red-800 dark:bg-red-950 dark:text-red-50",
  occurrence:
    "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-50",
  driver:
    "border-sky-300 bg-sky-50 text-sky-950 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-50",
};

/**
 * The floating operations alert (decision 14.6, design §6.6): bottom-right,
 * on every protected page of a user who works the deliveries. A persistent
 * pill with the server's counts (what was missed while offline reappears),
 * and cards for what just happened — an authorization request stays until
 * decided or dismissed. Clicking leads to the ticket. The sound is the
 * person's choice, saved on the server, and plays in one tab only.
 */
const OpsAlertBalloon = (): JSX.Element | null => {
  const router = useRouter();
  const queryClient = useQueryClient();

  const myUserId = useAuthStore((state) => state.id);
  const { canUseChat } = useChatAccess();
  const summary = useTicketsSummary();

  const [cards, setCards] = useState<AlertCard[]>([]);
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState<boolean>(false);

  const versionsRef = useRef<Map<string, number>>(new Map());
  const lastPlayedRef = useRef<number | null>(null);
  const leaderRef = useRef<SoundLeader | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const soundQuery = useQuery(
    OPS_ALERT_SOUND_KEY,
    async () => {
      const result = await getOpsAlertSound();

      if (!result.success || !result.data) throw new Error(result.message);

      return result.data.sound;
    },
    { enabled: canUseChat, staleTime: 5 * 60_000, refetchOnWindowFocus: false },
  );

  const soundEnabled = soundQuery.data ?? true;
  const soundEnabledRef = useRef<boolean>(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  // ------------------------------------------------------------ sound
  useEffect(() => {
    if (!canUseChat) return;

    audioRef.current = new Audio("/sounds/notification.aac");

    const locks =
      typeof navigator !== "undefined"
        ? ((navigator as Navigator & { locks?: LockManagerLike }).locks ?? null)
        : null;

    // Once this tab rings, the click prompt has nothing left to unlock.
    leaderRef.current = electSoundLeader(
      locks,
      (isLeader) => {
        if (isLeader) setNeedsAudioUnlock(false);
      },
      browserUserActivation(),
    );

    return () => {
      leaderRef.current?.stop();
      leaderRef.current = null;
      audioRef.current = null;
    };
  }, [canUseChat]);

  const ring = useCallback(async () => {
    const now = Date.now();

    const action = await alertSoundAction({
      soundEnabled: soundEnabledRef.current,
      leader: leaderRef.current,
      lastPlayedAt: lastPlayedRef.current,
      now,
    });

    // No tab can play yet (nobody clicked since the page loaded): say so
    // instead of losing the alert sound silently.
    if (action === "ask") {
      setNeedsAudioUnlock(true);
      return;
    }

    if (action !== "play") return;

    lastPlayedRef.current = now;

    const audio = audioRef.current;

    if (!audio) return;

    audio.currentTime = 0;

    // Autoplay policy: before any interaction with the site the browser
    // refuses audio; the balloon then offers the click that unlocks it.
    audio.play().catch(() => setNeedsAudioUnlock(true));
  }, []);

  // ---------------------------------------------------- tabs in sync
  useEffect(() => {
    if (!canUseChat || typeof BroadcastChannel === "undefined") return;

    const channel = new BroadcastChannel(ALERT_CHANNEL);

    channel.onmessage = (
      event: MessageEvent<{ type: string; ticketId?: string }>,
    ) => {
      if (event.data?.type === "dismiss" && event.data.ticketId) {
        setCards((current) => dropTicketCards(current, event.data.ticketId!));
      }
    };

    channelRef.current = channel;

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [canUseChat]);

  const dismiss = useCallback((ticketId: string) => {
    setCards((current) => dropTicketCards(current, ticketId));
    channelRef.current?.postMessage({ type: "dismiss", ticketId });
  }, []);

  // ---------------------------------------------------------- socket
  useEffect(() => {
    if (!canUseChat) return;

    let disposed = false;
    let bound: ReturnType<typeof getSocket> = null;

    const context = () => ({
      myUserId,
      openTicketId: getOpenTicketId(),
      windowFocused: typeof document !== "undefined" && document.hasFocus(),
      now: Date.now(),
    });

    const handleTicket = (event?: SupportTicketRealtimeEvent) => {
      if (disposed || !event?.ticket?.id) return;

      // Replicas promise no order: an older event never undoes a newer one.
      if (
        !acceptsVersion(
          versionsRef.current,
          event.ticket.id,
          event.ticket.version,
        )
      )
        return;

      if (clearsCards(event, myUserId)) {
        setCards((current) => dropTicketCards(current, event.ticket.id));
        return;
      }

      const card = cardForTicketEvent(event, context());

      if (!card) return;

      setCards((current) => pushCard(current, card));
      void ring();
    };

    const handleMessage = (message?: SentChatMessage) => {
      if (disposed || !message?.id) return;

      const card = cardForMessage(message, context());

      if (!card) return;

      setCards((current) => pushCard(current, card));
      void ring();
    };

    initializeSocket()
      .then((socket) => {
        if (disposed) return;

        bound = socket;
        socket.on("supportTicket", handleTicket);
        socket.on("chatMessage", handleMessage);
      })
      .catch(() => {
        // Without realtime the pill still refreshes on focus and resync.
      });

    // What happened while the socket was down comes back as counts.
    const stopResync = onRealtimeResync(() => {
      queryClient.invalidateQueries(["chat-tickets", "summary"]);
    });

    return () => {
      disposed = true;
      stopResync();
      bound?.off("supportTicket", handleTicket);
      bound?.off("chatMessage", handleMessage);
    };
  }, [canUseChat, myUserId, queryClient, ring]);

  // Non-sticky cards fade out on their own.
  useEffect(() => {
    if (cards.length === 0) return;

    const timer = setInterval(() => {
      setCards((current) => {
        const next = liveCards(current, Date.now());

        return next.length === current.length ? current : next;
      });
    }, 1_000);

    return () => clearInterval(timer);
  }, [cards.length]);

  const openTicket = (ticketId: string) => {
    dismiss(ticketId);
    router.push(
      `/dashboard/deliveries?${buildTicketSearchParams("", ticketId).toString()}`,
    );
  };

  const toggleSound = async () => {
    const next = !soundEnabled;

    // Optimistic: the switch answers at once; a failure puts it back.
    queryClient.setQueryData(OPS_ALERT_SOUND_KEY, next);

    const result = await updateOpsAlertSound(next);

    if (!result.success) {
      queryClient.setQueryData(OPS_ALERT_SOUND_KEY, !next);
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
  };

  // The click is the interaction the tab waited for: it joins the election
  // (capture listener in electSoundLeader) and plays the alert it missed.
  const unlockAudio = () => {
    setNeedsAudioUnlock(false);
    lastPlayedRef.current = Date.now();
    audioRef.current?.play().catch(() => setNeedsAudioUnlock(true));
  };

  if (!canUseChat) return null;

  const pill = summaryPill(summary);
  const { shown, hidden } = visibleCards(cards);
  const urgent = shown.some((card) => card.tone === "authorization");

  if (!pill && shown.length === 0 && !needsAudioUnlock) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(360px,calc(100vw-2rem))]
      flex-col items-end gap-2"
      data-testid="ops-alert-balloon"
      data-tutorial="ops-alert-balloon"
    >
      <div
        role="region"
        aria-label="Alertas da operação"
        aria-live={urgent ? "assertive" : "polite"}
        className="flex w-full flex-col gap-2"
      >
        {shown.map((card) => (
          <div
            key={card.key}
            className={cn(
              "pointer-events-auto flex w-full items-start gap-2 rounded-lg border p-3 shadow-lg",
              "motion-safe:animate-in motion-safe:slide-in-from-bottom-2",
              TONE_CLASSES[card.tone],
            )}
            onKeyDown={(event) => {
              if (event.key === "Escape") dismiss(card.ticketId);
            }}
          >
            <button
              type="button"
              className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-ring"
              onClick={() => openTicket(card.ticketId)}
            >
              <span className="block truncate text-sm font-semibold">
                {card.title}
              </span>
              <span className="line-clamp-2 text-xs opacity-90">
                {card.description}
              </span>
              {card.followUp ? (
                <span className="mt-0.5 line-clamp-1 text-xs opacity-90">
                  Última mensagem: {card.followUp}
                </span>
              ) : null}
            </button>

            <button
              type="button"
              aria-label="Dispensar alerta"
              className="shrink-0 rounded p-1 opacity-70 hover:opacity-100 focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => dismiss(card.ticketId)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}

        {hidden > 0 && (
          <p className="pointer-events-auto self-end rounded-full bg-muted px-2 py-0.5 text-xs">
            +{hidden}
          </p>
        )}
      </div>

      {needsAudioUnlock && (
        <button
          type="button"
          className="pointer-events-auto rounded-full border bg-background px-3 py-1.5 text-xs shadow"
          onClick={unlockAudio}
        >
          Clique para ativar o som dos alertas
        </button>
      )}

      {pill && (
        <div className="pointer-events-auto flex items-center gap-1 rounded-full border bg-background shadow-md">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-l-full px-3 py-1.5 text-xs font-medium
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => router.push("/dashboard/deliveries?tab=chat")}
          >
            <BellRing
              className={cn(
                "h-3.5 w-3.5",
                (summary?.pendingAuthorization ?? 0) > 0 &&
                  "text-red-600 dark:text-red-400",
              )}
            />
            {pill}
          </button>

          <button
            type="button"
            aria-label={
              soundEnabled
                ? "Desligar o som dos alertas"
                : "Ligar o som dos alertas"
            }
            aria-pressed={soundEnabled}
            className="rounded-r-full px-2 py-1.5 text-muted-foreground hover:text-foreground
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={toggleSound}
          >
            {soundEnabled ? (
              <Volume2 className="h-3.5 w-3.5" />
            ) : (
              <VolumeX className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export { OpsAlertBalloon, OPS_ALERT_SOUND_KEY };
