import { test, expect } from "@playwright/test";

import {
  EVERY_HINT,
  activeChatHint,
  chatHintLabel,
  chatHintPulseMs,
  chatHintVisibleMs,
  MIN_HINT_PULSE_SLACK_MS,
  RECORDING_HINT_VISIBLE_MS,
  RECORDING_PULSE_INTERVAL_MS,
  TYPING_HINT_VISIBLE_MS,
  TYPING_PULSE_INTERVAL_MS,
  type ChatHint,
} from "../../src/features/deliveries/chat/lib/chat-hints";

/** Every hint there is, so the invariant below cannot miss a new one. */
// Derived from the rules module, never typed out here: a hand-written list
// annotated `ChatHint[]` accepts any SUBSET of the union, so a third hint
// would slip past every assertion below while the suite stayed green.

test.describe("activeChatHint", () => {
  test("says nothing when nothing is happening", () => {
    expect(activeChatHint({ typing: false, recording: false })).toBeNull();
  });

  test("announces whichever one is lit on its own", () => {
    expect(activeChatHint({ typing: true, recording: false })).toBe("typing");
    expect(activeChatHint({ typing: false, recording: true })).toBe(
      "recording",
    );
  });

  test("recording wins when both are lit", () => {
    // The case the two events exist for: a note recording beside a
    // half-written message is both true at once, and the more specific
    // sentence is the one worth the line.
    expect(activeChatHint({ typing: true, recording: true })).toBe("recording");
  });
});

test.describe("chatHintLabel", () => {
  test("writes each hint the way the panel says it", () => {
    expect(chatHintLabel("typing")).toBe("digitando...");
    expect(chatHintLabel("recording")).toBe("gravando áudio...");
  });
});

test.describe("chatHintPulseMs", () => {
  test("gives each hint its own beat", () => {
    expect(chatHintPulseMs("typing")).toBe(TYPING_PULSE_INTERVAL_MS);
    expect(chatHintPulseMs("recording")).toBe(RECORDING_PULSE_INTERVAL_MS);
  });
});

test.describe("chatHintVisibleMs", () => {
  test("gives each hint its own window", () => {
    expect(chatHintVisibleMs("typing")).toBe(TYPING_HINT_VISIBLE_MS);
    expect(chatHintVisibleMs("recording")).toBe(RECORDING_HINT_VISIBLE_MS);
  });

  /**
   * THE invariant, and the reason both numbers live in one module.
   *
   * A hint is kept alive by being repeated and is ended by silence, so a
   * window that does not comfortably outlast its own pulse turns one late
   * packet into a bubble that blinks. Too much slack is the opposite
   * failure and the one that was just fixed — a sentence standing over a
   * conversation where nothing is happening.
   */
  test("every hint outlasts its own pulse, with room for a late one", () => {
    EVERY_HINT.forEach((hint) => {
      expect(chatHintVisibleMs(hint)).toBeGreaterThan(chatHintPulseMs(hint));

      expect(
        chatHintVisibleMs(hint) - chatHintPulseMs(hint),
      ).toBeGreaterThanOrEqual(MIN_HINT_PULSE_SLACK_MS);
    });
  });

  /**
   * The window used to be the audio ceiling plus twenty seconds, because
   * the hint was announced once and never repeated. Nothing about a
   * recording's LENGTH may size it again: what it measures now is silence
   * between two pulses, and that is a matter of seconds whatever is being
   * recorded.
   */
  test("puts a recording hint out in seconds, never in minutes", () => {
    EVERY_HINT.forEach((hint) => {
      expect(chatHintVisibleMs(hint)).toBeLessThanOrEqual(10_000);
    });
  });
});
