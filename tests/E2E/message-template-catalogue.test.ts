import { test, expect } from "@playwright/test";

import {
  MESSAGE_SLOTS,
  OPT_OUT_LINE,
  TEMPLATE_VARIABLES,
  slotKey,
} from "../../src/features/deliveries/message-templates/lib/catalogue";

/**
 * The six messages a company can write, and the suggestions it starts from.
 *
 * The suggestions matter more than they look: they are what most carriers will
 * actually send, because most people press "usar sugestão" and adjust a word.
 * A suggestion that used a variable the API refuses would hand every one of
 * them an error on their first save; a WhatsApp suggestion with no opt-out
 * link would hand them a refusal too — or worse, would be the text they edit
 * the link out of.
 */
test.describe("the message catalogue", () => {
  test("covers the three moments on both channels, once each", () => {
    expect(MESSAGE_SLOTS).toHaveLength(6);

    const keys = MESSAGE_SLOTS.map((slot) => slotKey(slot.topic, slot.channel));

    expect(new Set(keys).size).toBe(6);

    for (const topic of ["DISPATCHED", "DELIVERED", "FAILED"]) {
      for (const channel of ["EMAIL", "WHATSAPP"]) {
        expect(keys).toContain(`${topic}:${channel}`);
      }
    }
  });

  test("every suggestion uses only variables the API accepts", () => {
    // The API refuses an unknown one at save time. A suggestion that broke
    // that rule would hand an error to everybody who pressed the button.
    const known = new Set<string>(TEMPLATE_VARIABLES as readonly string[]);

    for (const slot of MESSAGE_SLOTS) {
      const used = [...slot.suggestion.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)].map(
        (match) => match[1],
      );

      expect(used.length, slot.title).toBeGreaterThan(0);

      for (const name of used) {
        expect(known, `${slot.title} uses {{${name}}}`).toContain(name);
      }
    }
  });

  test("every WhatsApp suggestion carries the way out", () => {
    // The API refuses a WhatsApp template without it. A suggestion that
    // lacked one would be refused the moment somebody accepted it.
    for (const slot of MESSAGE_SLOTS) {
      if (slot.channel !== "WHATSAPP") continue;

      expect(slot.suggestion, slot.title).toContain("{{link_descadastro}}");
    }

    expect(OPT_OUT_LINE).toContain("{{link_descadastro}}");
  });

  test("every suggestion sends the customer somewhere", () => {
    // A message about a delivery with no link is a message that starts a
    // phone call.
    for (const slot of MESSAGE_SLOTS) {
      expect(slot.suggestion, slot.title).toContain("{{link}}");
    }
  });

  test("names the moment and when it fires, for the card", () => {
    for (const slot of MESSAGE_SLOTS) {
      expect(slot.title.length).toBeGreaterThan(3);
      expect(slot.when.length).toBeGreaterThan(10);
    }
  });
});
