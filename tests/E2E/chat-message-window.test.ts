import { test, expect } from "@playwright/test";

import {
  appendNewer,
  canAppendLiveMessage,
  edgesAfterNewerPage,
  edgesAfterOlderPage,
  edgesFromPage,
  isAnchoredAtEnd,
  mergeBackAtEnd,
  newestReadStamp,
  prependOlder,
  toAscending,
  UNRESOLVED_WINDOW_EDGES,
  withoutAlreadySent,
  withoutKnown,
  type ChatMessagePage,
} from "../../src/features/deliveries/chat/lib/message-window";

const cursor = (id: string, created_at: string) => ({ id, created_at });

/** A message the merge has to identify across the wire, either way round. */
type Sendable = { id: string; client_submission_id: string | null };

/** A page as the API answers it: newest first, plus the two cursors. */
const page = (
  ids: string[],
  edges: Partial<Omit<ChatMessagePage, "data">> = {},
): ChatMessagePage => ({
  data: ids.map((id) => ({ id })),
  nextCursor: edges.nextCursor ?? null,
  previousCursor: edges.previousCursor ?? null,
  hasNewer: edges.hasNewer ?? false,
});

test.describe("chat message window", () => {
  test("turns the API order into the reading order", () => {
    expect(toAscending(page(["c", "b", "a"])).map((m) => m.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  test("an ordinary page is the whole end of the conversation", () => {
    // What every load answered before "pular para a mensagem" existed: more
    // history behind, nothing at all in front.
    const edges = edgesFromPage(
      page(["c", "b", "a"], {
        nextCursor: cursor("a", "2026-03-01T10:00:00Z"),
      }),
    );

    expect(edges.newerCursor).toBeNull();
    expect(edges.hasNewer).toBe(false);

    expect(isAnchoredAtEnd(edges)).toBe(true);
    expect(canAppendLiveMessage(edges)).toBe(true);
  });

  test("a page centred on a hit is open at both ends", () => {
    const edges = edgesFromPage(
      page(["m5", "m4", "m3"], {
        nextCursor: cursor("m3", "2026-03-01T10:00:00Z"),
        previousCursor: cursor("m5", "2026-03-01T10:02:00Z"),
        hasNewer: true,
      }),
    );

    expect(edges.olderCursor?.id).toBe("m3");
    expect(edges.newerCursor?.id).toBe("m5");

    expect(isAnchoredAtEnd(edges)).toBe(false);
  });

  test("a live message never lands in a window sitting in the past", () => {
    // The whole point of the rule: the message belongs to an end of the
    // conversation that is not loaded, so there is nowhere honest to put it.
    expect(
      canAppendLiveMessage({
        ...UNRESOLVED_WINDOW_EDGES,
        isResolved: true,
        hasNewer: true,
      }),
    ).toBe(false);
  });

  test("a window nobody has answered for is not at the end", () => {
    /**
     * The finding that survived a whole round intact. `hasNewer: false` on a
     * window with nothing in it used to read as "the end is on screen", so
     * while the opening request was still in the air a live arrival was
     * appended to a list nobody had drawn — and the read cursor was stamped
     * over it. The same value covered a load that had FAILED outright: the
     * panel showed an error and cleared the badge behind it.
     */
    expect(UNRESOLVED_WINDOW_EDGES.hasNewer).toBe(false);

    expect(isAnchoredAtEnd(UNRESOLVED_WINDOW_EDGES)).toBe(false);
    expect(canAppendLiveMessage(UNRESOLVED_WINDOW_EDGES)).toBe(false);
  });

  test("a page is what resolves a window, in both directions", () => {
    // Whichever way it was walked: an answer means the edges may be believed.
    expect(edgesFromPage(page(["m1"])).isResolved).toBe(true);

    expect(
      edgesAfterNewerPage(UNRESOLVED_WINDOW_EDGES, page(["m2"])).isResolved,
    ).toBe(true);

    // And walking back keeps whatever the window already knew about itself.
    const centred = edgesFromPage(page(["m5"], { hasNewer: true }));

    expect(edgesAfterOlderPage(centred, page(["m4"])).isResolved).toBe(true);
  });

  test("walking back moves only the cursor into the past", () => {
    const centred = edgesFromPage(
      page(["m5", "m4"], {
        nextCursor: cursor("m4", "2026-03-01T10:00:00Z"),
        previousCursor: cursor("m5", "2026-03-01T10:01:00Z"),
        hasNewer: true,
      }),
    );

    // A page walked backwards answers previousCursor: null / hasNewer: false
    // because from where IT stands there is nothing newer to report. Copying
    // those in would tell the window it was showing the end of the
    // conversation, and the way back would disappear from under the reader.
    const older = page(["m3", "m2"], {
      nextCursor: cursor("m2", "2026-02-28T09:00:00Z"),
    });

    const edges = edgesAfterOlderPage(centred, older);

    expect(edges.olderCursor?.id).toBe("m2");
    expect(edges.newerCursor?.id).toBe("m5");
    expect(edges.hasNewer).toBe(true);
  });

  test("walking forward moves only the cursor into the present", () => {
    const centred = edgesFromPage(
      page(["m5", "m4"], {
        nextCursor: cursor("m4", "2026-03-01T10:00:00Z"),
        previousCursor: cursor("m5", "2026-03-01T10:01:00Z"),
        hasNewer: true,
      }),
    );

    // And the mirror trap: a forward page answers nextCursor: null, which is
    // not "there is no more history" but "nobody asked about history".
    const newer = page(["m7", "m6"], {
      previousCursor: cursor("m7", "2026-03-01T10:05:00Z"),
      hasNewer: true,
    });

    const edges = edgesAfterNewerPage(centred, newer);

    expect(edges.olderCursor?.id).toBe("m4");
    expect(edges.newerCursor?.id).toBe("m7");
    expect(edges.hasNewer).toBe(true);
  });

  test("the last forward page closes the window on the present", () => {
    const centred = edgesFromPage(
      page(["m5"], {
        nextCursor: cursor("m5", "2026-03-01T10:00:00Z"),
        previousCursor: cursor("m5", "2026-03-01T10:00:00Z"),
        hasNewer: true,
      }),
    );

    const edges = edgesAfterNewerPage(centred, page(["m7", "m6"]));

    expect(edges.newerCursor).toBeNull();
    expect(edges.hasNewer).toBe(false);

    // Which is what lets the pane append live messages — and mark them read
    // — again.
    expect(canAppendLiveMessage(edges)).toBe(true);
    expect(edges.olderCursor?.id).toBe("m5");
  });

  test("keeps only what is not already on screen", () => {
    const known = [{ id: "b" }, { id: "c" }];

    expect(withoutKnown([{ id: "a" }, { id: "b" }], known)).toEqual([
      { id: "a" },
    ]);

    expect(withoutKnown([{ id: "a" }], [])).toEqual([{ id: "a" }]);
  });

  test("pages never duplicate a message that overlapped them", () => {
    // The cursor is exclusive, but a message sent while the page was in
    // flight can legitimately land in both halves.
    const current = [{ id: "c" }, { id: "d" }];

    expect(
      prependOlder(current, [{ id: "a" }, { id: "b" }, { id: "c" }]),
    ).toEqual([{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }]);

    expect(appendNewer(current, [{ id: "d" }, { id: "e" }])).toEqual([
      { id: "c" },
      { id: "d" },
      { id: "e" },
    ]);
  });

  test("coming back to the end keeps what arrived while it was away", () => {
    // The message the page cannot contain: the server built it at T, the
    // driver wrote at T+20ms, and the socket event landed while the pane was
    // still parked on a hit from March. It used to be discarded outright.
    const page = [{ id: "m40" }, { id: "m41" }];
    const held = [{ id: "m42" }];
    const stillSending = [{ id: "local-1" }];

    expect(mergeBackAtEnd(page, held, stillSending)).toEqual([
      { id: "m40" },
      { id: "m41" },
      { id: "m42" },
      { id: "local-1" },
    ]);
  });

  test("an arrival the page already carries is not shown twice", () => {
    // Held at T+20ms, and the page fetched afterwards has it: the buffer is
    // emptied either way, and the reader must not see it twice.
    expect(
      mergeBackAtEnd([{ id: "m41" }, { id: "m42" }], [{ id: "m42" }], []),
    ).toEqual([{ id: "m41" }, { id: "m42" }]);
  });

  test("nothing held and nothing sending is the page itself", () => {
    expect(mergeBackAtEnd([{ id: "m1" }], [], [])).toEqual([{ id: "m1" }]);
  });

  test("a send the server already confirmed is not drawn twice", () => {
    /**
     * The identity that matches across the wire is the submission id, never
     * the id: the optimistic photo is `local-<uuid>` and its confirmed twin
     * carries the server id, so deduplicating by id left the same photo on
     * screen twice — once confirmed, once pending for ever.
     */
    const page = [{ id: "m40", client_submission_id: "sub-1" }];
    const stillSending = [{ id: "local-sub-1", client_submission_id: "sub-1" }];

    expect(mergeBackAtEnd(page, [], stillSending)).toEqual(page);
  });

  test("a send the server has not confirmed survives the jump", () => {
    // The rule the module states outright: our own sends belong to the end
    // and must survive a jump nobody asked them to make.
    const page: Sendable[] = [{ id: "m40", client_submission_id: null }];
    const stillSending: Sendable[] = [
      { id: "local-sub-2", client_submission_id: "sub-2" },
    ];

    expect(mergeBackAtEnd(page, [], stillSending)).toEqual([
      ...page,
      ...stillSending,
    ]);
  });

  test("an echo that came back through the held buffer counts too", () => {
    // The confirmation can arrive over the socket rather than in the page,
    // and it is just as much a reason not to draw the photo a second time.
    const page: Sendable[] = [{ id: "m40", client_submission_id: null }];
    const held: Sendable[] = [{ id: "m41", client_submission_id: "sub-3" }];
    const stillSending: Sendable[] = [
      { id: "local-sub-3", client_submission_id: "sub-3" },
    ];

    expect(mergeBackAtEnd(page, held, stillSending)).toEqual([
      ...page,
      ...held,
    ]);
  });

  test("a send with no submission id is never mistaken for a confirmed one", () => {
    const landed: Sendable[] = [{ id: "m40", client_submission_id: null }];
    const stillSending: Sendable[] = [
      { id: "local-x", client_submission_id: null },
    ];

    expect(withoutAlreadySent(stillSending, landed)).toEqual(stillSending);
  });

  test("the read cursor reaches the newest message on screen", () => {
    const stamp = newestReadStamp([
      { created_at: "2026-03-01T10:00:00.000Z" },
      { created_at: "2026-03-01T10:02:00.000Z" },
      { created_at: "2026-03-01T10:01:00.000Z" },
    ]);

    expect(stamp).toBe("2026-03-01T10:02:00.000Z");
  });

  test("the read cursor never reports a message still on the wire", () => {
    // An optimistic send is stamped with THIS browser's clock: reporting it
    // is Date.now() in disguise, and "now" covers the whole thread — the
    // message that arrived while the window was detached included.
    const stamp = newestReadStamp([
      { created_at: "2026-03-01T10:00:00.000Z" },
      { created_at: "2026-09-09T12:00:00.000Z", pending: true },
      { created_at: "2026-09-09T12:00:01.000Z", failed: true },
    ]);

    expect(stamp).toBe("2026-03-01T10:00:00.000Z");
  });

  test("nothing rendered reports nothing at all", () => {
    // The caller then says nothing and lets the server use its own clock,
    // which covers nothing that was not already covered.
    expect(newestReadStamp([])).toBeNull();

    expect(
      newestReadStamp([
        { created_at: "2026-09-09T12:00:00.000Z", pending: true },
      ]),
    ).toBeNull();
  });

  test("the stamp of a window in the past stays in the past", () => {
    // The whole point of sending it: a reader parked on March marks read at
    // March, so a message written today — one this browser never received —
    // is not covered by the cursor.
    const marchWindow = [
      { created_at: "2026-03-01T09:59:00.000Z" },
      { created_at: "2026-03-01T10:00:00.000Z" },
    ];

    expect(newestReadStamp(marchWindow)).toBe("2026-03-01T10:00:00.000Z");
  });
});
