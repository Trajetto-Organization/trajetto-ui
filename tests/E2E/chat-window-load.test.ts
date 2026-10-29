import { test, expect } from "@playwright/test";

import { settleWindowLoad } from "../../src/features/deliveries/chat/lib/window-load";

const FALLBACK = "Não foi possível carregar a conversa.";

test.describe("settling a window load", () => {
  test("hands back the page a successful answer carries", async () => {
    const outcome = await settleWindowLoad(
      async () => ({ success: true, message: "ok", data: { id: "page" } }),
      FALLBACK,
    );

    expect(outcome).toEqual({ ok: true, page: { id: "page" } });
  });

  test("a refusal keeps the sentence the action wrote", async () => {
    const outcome = await settleWindowLoad(
      async () => ({ success: false, message: "Conversa não identificada." }),
      FALLBACK,
    );

    expect(outcome).toEqual({
      ok: false,
      message: "Conversa não identificada.",
    });
  });

  test("success with nothing in it is the same nothing as a refusal", async () => {
    /**
     * Told apart here and not at four call sites: three of them did not tell
     * them apart at all, and a page that is `undefined` reaching the merge is
     * how a window ends up empty with no explanation on screen.
     */
    const outcome = await settleWindowLoad(
      async () => ({ success: true, message: "", data: null }),
      FALLBACK,
    );

    expect(outcome).toEqual({ ok: false, message: FALLBACK });
  });

  test("a rejection becomes an answer instead of an exception", async () => {
    /**
     * The whole reason this exists. `listChatMessages` read its cookie
     * outside its own try and could reject; the caller released its
     * in-flight slot on the line after the await, in straight-line code, so
     * a rejection skipped it — and the counter, which IS the mutual
     * exclusion between the three window buttons, never came back down. All
     * three stayed disabled for the rest of the session, "Ir para a última
     * mensagem" among them: the only way back to the arrivals the pane was
     * holding.
     */
    const outcome = await settleWindowLoad(async () => {
      throw new Error("Failed to fetch");
    }, FALLBACK);

    expect(outcome).toEqual({ ok: false, message: FALLBACK });
  });

  test("a request that throws before it awaits is still an answer", async () => {
    const outcome = await settleWindowLoad(() => {
      throw new Error("no server action available");
    }, FALLBACK);

    expect(outcome).toEqual({ ok: false, message: FALLBACK });
  });

  test("a refusal with no sentence of its own still says something", async () => {
    const outcome = await settleWindowLoad(
      async () => ({ success: false, message: "" }),
      FALLBACK,
    );

    expect(outcome).toEqual({ ok: false, message: FALLBACK });
  });
});
