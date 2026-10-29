import { describe, expect, it, vi } from "vitest";

import type {
  SentChatMessage,
  SupportTicketRealtimeEvent,
} from "@/actions/chat/chat.types";

import {
  ALERT_CARD_TTL_MS,
  SOUND_MIN_INTERVAL_MS,
  acceptsVersion,
  cardForMessage,
  cardForTicketEvent,
  clearsCards,
  dropTicketCards,
  liveCards,
  pushCard,
  shouldPlaySound,
  summaryPill,
  visibleCards,
  type AlertCard,
} from "@/features/deliveries/ops-alert/rules";
import {
  SOUND_LOCK_NAME,
  alertSoundAction,
  electSoundLeader,
} from "@/features/deliveries/ops-alert/sound-leader";

/** The floating operations alert (decision 14.6, design §6.6). */
const NOW = 1_000_000;

const context = {
  myUserId: "me",
  openTicketId: null,
  windowFocused: true,
  now: NOW,
};

function ticketEvent(
  overrides: Omit<Partial<SupportTicketRealtimeEvent>, "ticket"> & {
    ticket?: Partial<SupportTicketRealtimeEvent["ticket"]>;
  } = {},
): SupportTicketRealtimeEvent {
  const { ticket, ...rest } = overrides;

  return {
    type: "ticket.opened",
    actor: { id: "driver-user", name: "João" },
    ...rest,
    ticket: {
      id: "tk1",
      number: 128,
      kind: "OCCURRENCE",
      status: "OPEN",
      subject: "Cliente ausente — Mercado Sol",
      version: 1,
      threadId: "th1",
      driver: { id: "d1", name: "João" },
      delivery: null,
      route: null,
      occurrence: null,
      assignee: null,
      waitingOn: null,
      opened_via: "OCCURRENCE_REPORT",
      openedBy: null,
      closedBy: null,
      closed_at: null,
      close_outcome: null,
      close_note: null,
      closeOutcomes: ["RESOLVED"],
      last_message_at: null,
      lastMessage: null,
      created_at: "2026-10-05T10:00:00.000Z",
      ...ticket,
    } as SupportTicketRealtimeEvent["ticket"],
  };
}

function driverMessage(
  overrides: Partial<SentChatMessage> = {},
): SentChatMessage {
  return {
    id: "m1",
    kind: "TEXT",
    body: "Cliente não atende",
    attachment_url: null,
    duration_ms: null,
    deliveryId: null,
    broadcast_id: null,
    client_submission_id: null,
    threadId: "th1",
    senderId: "driver-user",
    sender: { id: "driver-user", name: "João" },
    delivery: null,
    created_at: "2026-10-05T10:00:00.000Z",
    driver: { id: "d1", name: "João" },
    ticket: {
      id: "tk1",
      number: 128,
      status: "OPEN",
      assigneeId: null,
      version: 2,
    },
    senderSide: "DRIVER",
    ...overrides,
  };
}

describe("cards from ticket events", () => {
  it("pins a red card for an authorization request until it is decided", () => {
    const card = cardForTicketEvent(
      ticketEvent({
        alert: {
          reason: "AUTHORIZATION",
          occurrenceTypeName: "Cliente ausente",
          recipientName: "Mercado Sol",
          driverName: "João",
        },
      }),
      context,
    );

    expect(card).toMatchObject({
      tone: "authorization",
      title: "Pedido de autorização",
      description: "Cliente ausente — Mercado Sol · João",
      sticky: true,
      ticketId: "tk1",
    });
  });

  it("shows an amber card for an occurrence and a blue one for a subject the driver opened", () => {
    expect(
      cardForTicketEvent(
        ticketEvent({ alert: { reason: "OCCURRENCE", driverName: "João" } }),
        context,
      ),
    ).toMatchObject({
      tone: "occurrence",
      sticky: false,
      ttlMs: ALERT_CARD_TTL_MS,
    });

    expect(
      cardForTicketEvent(
        ticketEvent({
          ticket: { kind: "DRIVER", subject: "Pneu furado" },
          alert: { reason: "DRIVER_OPENED", driverName: "João" },
        }),
        context,
      ),
    ).toMatchObject({
      tone: "driver",
      title: "Novo atendimento de João",
      description: "Pneu furado",
    });
  });

  it("pops nothing for the reader's own act, nor for events that are not an opening", () => {
    expect(
      cardForTicketEvent(
        ticketEvent({
          actor: { id: "me", name: "Eu" },
          alert: { reason: "OCCURRENCE", driverName: "João" },
        }),
        context,
      ),
    ).toBeNull();
    expect(
      cardForTicketEvent(ticketEvent({ type: "ticket.assigned" }), context),
    ).toBeNull();
    expect(
      cardForTicketEvent(ticketEvent({ ticket: { kind: "DRIVER" } }), context),
    ).toBeNull();
  });

  it("rings nobody for an occurrence ticket a colleague opened from the panel", () => {
    // "Abrir atendimento" on an old occurrence: kind OCCURRENCE, even a
    // pending request, but no alert from the server.
    const fromPanel = ticketEvent({
      actor: { id: "colleague", name: "Bruno" },
      ticket: {
        kind: "OCCURRENCE",
        opened_via: "PANEL",
        occurrence: {
          id: "oc1",
          typeName: "Cliente ausente",
          authorization_status: "PENDING",
          escalates_at: null,
        },
      },
    });

    expect(cardForTicketEvent(fromPanel, context)).toBeNull();
    expect(
      cardForTicketEvent({ ...fromPanel, type: "ticket.linked" }, context),
    ).toBeNull();
  });
});

describe("cards from messages", () => {
  it("calls for the driver's message in an unassigned ticket", () => {
    expect(cardForMessage(driverMessage(), context)).toMatchObject({
      key: "message:m1",
      title: "Mensagem de João em #128",
      description: "Cliente não atende",
    });
  });

  it("stays silent for someone else's ticket, the tower's messages, a mass notice and the ticket on screen", () => {
    expect(
      cardForMessage(
        driverMessage({
          ticket: {
            id: "tk1",
            number: 1,
            status: "OPEN",
            assigneeId: "otto",
            version: 1,
          },
        }),
        context,
      ),
    ).toBeNull();
    expect(
      cardForMessage(
        driverMessage({ senderSide: "STAFF", senderId: "otto" }),
        context,
      ),
    ).toBeNull();
    expect(
      cardForMessage(driverMessage({ senderId: "me" }), context),
    ).toBeNull();
    expect(cardForMessage(driverMessage({ ticket: null }), context)).toBeNull();
    expect(
      cardForMessage(driverMessage(), { ...context, openTicketId: "tk1" }),
    ).toBeNull();

    // The same ticket open in a window without focus still calls.
    expect(
      cardForMessage(driverMessage(), {
        ...context,
        openTicketId: "tk1",
        windowFocused: false,
      }),
    ).not.toBeNull();

    // Mine: it calls me.
    expect(
      cardForMessage(
        driverMessage({
          ticket: {
            id: "tk1",
            number: 1,
            status: "OPEN",
            assigneeId: "me",
            version: 1,
          },
        }),
        context,
      ),
    ).not.toBeNull();
  });
});

describe("the stack", () => {
  const card = (
    key: string,
    ticketId: string,
    extra: Partial<AlertCard> = {},
  ): AlertCard => ({
    key,
    ticketId,
    tone: "driver",
    title: key,
    description: "",
    sticky: false,
    ttlMs: ALERT_CARD_TTL_MS,
    createdAt: NOW,
    ...extra,
  });

  it("dedupes the same event, keeps one card per ticket, newest first", () => {
    let cards = pushCard([], card("a", "t1"));

    cards = pushCard(cards, card("a", "t1"));
    expect(cards).toHaveLength(1);

    cards = pushCard(cards, card("b", "t2"));
    cards = pushCard(cards, card("c", "t1"));

    expect(cards.map((entry) => entry.key)).toEqual(["c", "b"]);
  });

  it("a driver's message never takes the place of the ticket's own card", () => {
    // Red before: the opening message of a ticket arrives right after
    // `ticket.opened` and replaced "Novo atendimento de …" with "Mensagem de
    // … em #2" (found by tests/ui/support-tickets.spec.ts); a message on a
    // ticket waiting for authorization replaced the red, sticky "Pedido de
    // autorização" card with a blue one that fades in 20 s.
    const opened = card("tk1:ticket.opened:1", "tk1");
    const authorization = card("tk2:ticket.opened:1", "tk2", {
      tone: "authorization",
      sticky: true,
      ttlMs: null,
    });

    let cards = pushCard([], opened);
    cards = pushCard(cards, authorization);

    cards = pushCard(cards, card("message:m1", "tk1"));
    cards = pushCard(cards, card("message:m2", "tk2"));

    expect(cards.map((entry) => entry.key)).toEqual([
      "tk2:ticket.opened:1",
      "tk1:ticket.opened:1",
    ]);

    // Once the ticket's card is gone, its next message does call the tower.
    cards = pushCard(dropTicketCards(cards, "tk1"), card("message:m3", "tk1"));
    expect(cards.map((entry) => entry.key)).toContain("message:m3");

    // And a newer ticket event still replaces whatever the ticket had.
    cards = pushCard(cards, card("tk1:ticket.reopened:3", "tk1"));
    expect(
      cards
        .filter((entry) => entry.ticketId === "tk1")
        .map((entry) => entry.key),
    ).toEqual(["tk1:ticket.reopened:3"]);
  });

  it("a follow-up message rides on the ticket's card: its text shows and the card lives on", () => {
    // Red before: the message was discarded while the 20 s OCCURRENCE card
    // was up, so its text never showed and the card faded on the old clock.
    const occurrence = card("tk1:ticket.opened:1", "tk1", {
      tone: "occurrence",
      title: "Ocorrência",
      description: "Recusa — Loja 3 · Ana",
    });
    const later = NOW + 15_000;

    let cards = pushCard([], occurrence);
    cards = pushCard(
      cards,
      card("message:m1", "tk1", {
        description: "Cliente fechou a loja",
        createdAt: later,
      }),
    );

    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      key: "tk1:ticket.opened:1",
      tone: "occurrence",
      title: "Ocorrência",
      description: "Recusa — Loja 3 · Ana",
      followUp: "Cliente fechou a loja",
      createdAt: later,
    });

    // Alive past the original card's 20 s, because of the follow-up.
    expect(liveCards(cards, NOW + ALERT_CARD_TTL_MS + 1)).toHaveLength(1);

    // The same message delivered twice (reconnection) changes nothing.
    expect(
      pushCard(
        cards,
        card("message:m1", "tk1", { description: "Cliente fechou a loja" }),
      ),
    ).toBe(cards);

    // A newer one replaces the line.
    cards = pushCard(
      cards,
      card("message:m2", "tk1", {
        description: "Vou aguardar",
        createdAt: later,
      }),
    );
    expect(cards[0].followUp).toBe("Vou aguardar");
  });

  it("lets plain cards expire and keeps the sticky ones, shows three and +N", () => {
    const cards = [
      card("old", "t1", { createdAt: NOW - ALERT_CARD_TTL_MS }),
      card("fresh", "t2"),
      card("pinned", "t3", { sticky: true, ttlMs: null, createdAt: 0 }),
    ];

    expect(liveCards(cards, NOW).map((entry) => entry.key)).toEqual([
      "fresh",
      "pinned",
    ]);
    expect(
      visibleCards([...cards, card("x", "t4"), card("y", "t5")]),
    ).toMatchObject({ hidden: 2 });
    expect(dropTicketCards(cards, "t3").map((entry) => entry.key)).toEqual([
      "old",
      "fresh",
    ]);
  });

  it("clears a ticket's cards when it closes or someone else takes it", () => {
    expect(clearsCards(ticketEvent({ type: "ticket.closed" }), "me")).toBe(
      true,
    );
    expect(
      clearsCards(
        ticketEvent({
          type: "ticket.assigned",
          ticket: { assignee: { id: "otto", name: "Otto" } },
        }),
        "me",
      ),
    ).toBe(true);
    expect(
      clearsCards(
        ticketEvent({
          type: "ticket.assigned",
          ticket: { assignee: { id: "me", name: "Eu" } },
        }),
        "me",
      ),
    ).toBe(false);
    expect(clearsCards(ticketEvent({ type: "ticket.opened" }), "me")).toBe(
      false,
    );
  });

  it("drops an event older than what was applied (replicas promise no order)", () => {
    const applied = new Map<string, number>();

    expect(acceptsVersion(applied, "t1", 3)).toBe(true);
    expect(acceptsVersion(applied, "t1", 2)).toBe(false);
    expect(acceptsVersion(applied, "t1", 3)).toBe(false);
    expect(acceptsVersion(applied, "t1", 4)).toBe(true);
  });
});

describe("the sound", () => {
  it("rings only with the sound on, in the leader tab, once per burst", () => {
    const base = {
      soundEnabled: true,
      isSoundLeader: true,
      lastPlayedAt: null,
      now: NOW,
    };

    expect(shouldPlaySound(base)).toBe(true);
    expect(shouldPlaySound({ ...base, soundEnabled: false })).toBe(false);
    expect(shouldPlaySound({ ...base, isSoundLeader: false })).toBe(false);
    expect(
      shouldPlaySound({
        ...base,
        lastPlayedAt: NOW - SOUND_MIN_INTERVAL_MS + 1,
      }),
    ).toBe(false);
    expect(
      shouldPlaySound({ ...base, lastPlayedAt: NOW - SOUND_MIN_INTERVAL_MS }),
    ).toBe(true);
  });

  it("elects one tab through Web Locks and hands over when it stops", async () => {
    // A lock manager with a queue, like the browser's.
    const queue: Array<() => Promise<void>> = [];
    let busy = false;

    const pump = async () => {
      if (busy || queue.length === 0) return;
      busy = true;
      const next = queue.shift()!;
      await next();
      busy = false;
      void pump();
    };

    const locks = {
      request: (_name: string, callback: () => Promise<void>) => {
        const done = new Promise<void>((resolve) =>
          queue.push(() => callback().then(resolve)),
        );
        void pump();
        return done;
      },
    };

    const first = electSoundLeader(locks);
    const second = electSoundLeader(locks);

    await vi.waitFor(() => expect(first.isLeader()).toBe(true));
    expect(second.isLeader()).toBe(false);

    first.stop();

    await vi.waitFor(() => expect(second.isLeader()).toBe(true));
    expect(first.isLeader()).toBe(false);

    second.stop();
  });

  it("keeps a tab nobody touched out of the election until the first interaction", async () => {
    const requested: string[] = [];
    const locks = {
      request: (name: string, callback: () => Promise<void>) => {
        requested.push(name);
        void callback();
        return new Promise<void>(() => {});
      },
    };

    let active = false;
    let fire: (() => void) | null = null;
    const activation = {
      hasBeenActive: () => active,
      onFirstActivation: (callback: () => void) => {
        fire = callback;
        return () => {
          fire = null;
        };
      },
    };

    const untouched = electSoundLeader(locks, undefined, activation);

    // A background tab never asks for the lock, so it never wins it.
    expect(requested).toHaveLength(0);
    expect(untouched.isLeader()).toBe(false);

    active = true;
    fire!();

    await vi.waitFor(() => expect(untouched.isLeader()).toBe(true));
    expect(requested).toHaveLength(1);

    untouched.stop();

    // A tab already interacted with competes at once; a stopped one never does.
    const used = electSoundLeader(locks, undefined, {
      ...activation,
      hasBeenActive: () => true,
    });
    expect(requested).toHaveLength(2);
    used.stop();

    active = false;
    const closed = electSoundLeader(locks, undefined, activation);
    closed.stop();
    expect(fire).toBeNull();
  });

  it("asks for the click when an alert arrives and no tab can play (review round 3)", async () => {
    // After a reload nobody clicked: no tab requested the lock, nobody holds it.
    const held: Array<{ name: string }> = [];
    const locks = {
      request: (name: string, callback: () => Promise<void>) => {
        held.push({ name });
        void callback();
        return new Promise<void>(() => {});
      },
      query: async () => ({ held }),
    };

    let active = false;
    let fire: (() => void) | null = null;
    const activation = {
      hasBeenActive: () => active,
      onFirstActivation: (callback: () => void) => {
        fire = callback;
        return () => {
          fire = null;
        };
      },
    };

    const tab = electSoundLeader(locks, undefined, activation);
    const alert = {
      soundEnabled: true,
      leader: tab,
      lastPlayedAt: null,
      now: NOW,
    };

    // The old balloon returned early here (not the leader) and never prompted.
    expect(await alertSoundAction(alert)).toBe("ask");
    expect(await alertSoundAction({ ...alert, soundEnabled: false })).toBe(
      "none",
    );

    // The click on the prompt is the first interaction: the tab joins and rings.
    active = true;
    fire!();

    await vi.waitFor(() => expect(tab.isLeader()).toBe(true));
    expect(await alertSoundAction(alert)).toBe("play");
    expect(await alertSoundAction({ ...alert, lastPlayedAt: NOW - 1 })).toBe(
      "none",
    );

    tab.stop();
  });

  it("does not ask in an untouched tab while another tab rings", async () => {
    const locks = {
      request: () => new Promise<void>(() => {}),
      query: async () => ({ held: [{ name: SOUND_LOCK_NAME }] }),
    };
    const activation = {
      hasBeenActive: () => false,
      onFirstActivation: () => () => {},
    };

    const background = electSoundLeader(locks, undefined, activation);

    expect(
      await alertSoundAction({
        soundEnabled: true,
        leader: background,
        lastPlayedAt: null,
        now: NOW,
      }),
    ).toBe("none");

    background.stop();
  });

  it("lets every tab ring where the API does not exist", () => {
    expect(electSoundLeader(undefined).isLeader()).toBe(true);
  });
});

describe("the pill", () => {
  it("summarizes what waits, or says nothing", () => {
    expect(
      summaryPill({ unassigned: 3, pendingAuthorization: 1, unreadOpen: 2 }),
    ).toBe("3 sem atendente · 1 autorização · 2 não lidos");
    expect(
      summaryPill({ unassigned: 0, pendingAuthorization: 2, unreadOpen: 1 }),
    ).toBe("2 autorizações · 1 não lido");
    expect(
      summaryPill({ unassigned: 0, pendingAuthorization: 0, unreadOpen: 0 }),
    ).toBeNull();
    expect(summaryPill(null)).toBeNull();
  });
});
