import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { readFileSync } from "node:fs";

import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * One Atualizar in Atendimentos (decision of 28/10/2026, spec §6.3).
 *
 * The ticket list drew its own "Atualizar" under the Torre's. Measured on
 * the code: it only marked the `chat-tickets` queries stale — the list, the
 * counters, the open ticket's detail. The Torre's Atualizar
 * (useRevalidateScreen) re-renders the server part, refreshes EVERY query of
 * the tab (those included, plus the open conversation and the message
 * search) and tells the state outside react-query; the Torre's cadence and
 * the socket refetch the same `chat-tickets` root on their own. A strict
 * subset of a button on the same screen: the inner one is gone, the error
 * state keeps its "Tentar novamente".
 */
(globalThis as { React?: typeof React }).React = React;
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/features/deliveries/chat/new-conversation-popover", () => ({
  NewConversationPopover: () => null,
}));
vi.mock("@/features/deliveries/chat/broadcast-dialog", () => ({
  BroadcastDialog: () => null,
}));

import { TicketList } from "@/features/deliveries/chat/tickets/ticket-list";

let root: Root | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

async function mountList(
  props: Partial<React.ComponentProps<typeof TicketList>> = {},
): Promise<HTMLElement> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () =>
    root!.render(
      createElement(TicketList, {
        tickets: [],
        counts: null,
        filter: "OPEN",
        onFilterChange: () => {},
        search: "",
        onSearchChange: () => {},
        isLoading: false,
        errorMessage: "",
        onRetry: () => {},
        hasMore: false,
        isLoadingMore: false,
        onLoadMore: () => {},
        selectedTicketId: null,
        onSelectTicket: () => {},
        onPickDriver: () => {},
        messageHits: [],
        onSelectHit: () => {},
        canWrite: true,
        isReadOnly: false,
        myUserId: null,
        onBroadcastSent: () => {},
        ...props,
      } as React.ComponentProps<typeof TicketList>),
    ),
  );

  return host;
}

const buttonsNamed = (host: HTMLElement, name: RegExp) =>
  [...host.querySelectorAll("button")].filter((button) =>
    name.test(
      (button.getAttribute("aria-label") ?? button.textContent ?? "").trim(),
    ),
  );

describe("the ticket list under the Torre's header", () => {
  it("has no Atualizar of its own", async () => {
    const host = await mountList();

    const list = host.querySelector('[data-tutorial="chat-threads"]')!;

    expect(list).not.toBeNull();
    expect(buttonsNamed(list as HTMLElement, /atualizar/i)).toEqual([]);
  });

  it("keeps the way out of a failed read", async () => {
    const onRetry = vi.fn();
    const host = await mountList({
      errorMessage: "Houve um erro ao carregar as conversas.",
      onRetry,
    });

    const retry = buttonsNamed(host, /^Tentar novamente$/);

    expect(retry).toHaveLength(1);

    await act(async () => retry[0].click());

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("is only ever rendered under a header that has the Torre's Atualizar", () => {
    // ChatPanel is the list's one mount, and the tickets view is its one
    // mount: under `frame(...)` with the default "tower" actions.
    const views = readFileSync(
      "src/features/control-tower/views/index.tsx",
      "utf8",
    );
    const tickets = /if \(view === "tickets"\) \{[\s\S]*?\n {2}\}/.exec(
      views,
    )?.[0];

    expect(tickets).toContain("<ChatPanel");
    expect(tickets).not.toMatch(/"none"|"occurrences"/);

    const panel = readFileSync(
      "src/features/deliveries/chat/index.tsx",
      "utf8",
    );

    expect(panel).not.toMatch(/onRefresh=|isRefreshing=/);
  });
});
