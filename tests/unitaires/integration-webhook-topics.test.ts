// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  familyWildcards,
  isCovered,
  isCoveredByWildcard,
  isFamilySelected,
  normalizeSubscriptions,
  partialWildcards,
  removeSubscription,
  sameSubscriptions,
  toggleFamily,
  unknownSubscriptions,
} from "@/features/integrations/lib/webhook-topics";
import {
  isUnreachableHost,
  validateWebhookForm,
} from "@/features/integrations/lib/webhook-form-schema";

/**
 * Subscriptions as the dispatcher reads them (DLVB-22, decision 5.9), and the
 * webhook form's rules (DLVB-24), without a browser.
 */
const DOCUMENTS = [
  { topic: "delivery.created" },
  { topic: "delivery.delivered" },
  { topic: "occurrence.reported" },
  { topic: "proof.registered" },
];

describe("the wildcards of a family", () => {
  it("are the prefixes of its topics, never the family's name", () => {
    expect(familyWildcards("document", DOCUMENTS)).toEqual([
      "delivery.*",
      "occurrence.*",
      "proof.*",
    ]);
    expect(familyWildcards("route", [{ topic: "route.started" }])).toEqual([
      "route.*",
    ]);
  });

  it("follow the catalogue when it states them", () => {
    expect(
      familyWildcards("document", DOCUMENTS, {
        families: [{ family: "document", wildcards: ["delivery.*"] }],
      }),
    ).toEqual(["delivery.*"]);
  });
});

describe("what a subscription covers", () => {
  it("is decided by prefix, as the dispatcher decides", () => {
    expect(isCovered(["delivery.*"], "delivery.failed")).toBe(true);
    expect(isCovered(["delivery.*"], "proof.registered")).toBe(false);
    expect(isCovered(["route.started"], "route.started")).toBe(true);
    expect(isCovered(["*"], "route.started")).toBe(false);
  });

  it("locks the topics a wildcard covers, not the ones chosen by name", () => {
    expect(isCoveredByWildcard(["delivery.*"], "delivery.created")).toBe(true);
    expect(isCoveredByWildcard(["delivery.created"], "delivery.created")).toBe(
      false,
    );
  });

  it("still reads a legacy document.* as the whole family", () => {
    for (const { topic } of DOCUMENTS) {
      expect(isCovered(["document.*"], topic), topic).toBe(true);
    }
  });
});

describe("turning a family on and off", () => {
  const wildcards = ["delivery.*", "occurrence.*", "proof.*"];
  const names = DOCUMENTS.map((entry) => entry.topic);

  it("replaces the family's names with its wildcards, keeping other families", () => {
    const on = toggleFamily(
      ["route.started", "delivery.created"],
      wildcards,
      names,
    );

    expect(on).toEqual(["route.started", ...wildcards]);
    expect(isFamilySelected(on, wildcards)).toBe(true);
  });

  it("completes a family that was partly subscribed by wildcard", () => {
    expect(toggleFamily(["delivery.*"], wildcards, names).sort()).toEqual(
      [...wildcards].sort(),
    );
  });

  it("takes the wildcards away again", () => {
    expect(toggleFamily(["route.*", ...wildcards], wildcards, names)).toEqual([
      "route.*",
    ]);
  });
});

describe("comparing subscriptions for the edit form", () => {
  it("ignores order and the legacy spelling", () => {
    expect(normalizeSubscriptions(["document.*", "route.*"])).toEqual([
      "delivery.*",
      "occurrence.*",
      "proof.*",
      "route.*",
    ]);

    expect(
      sameSubscriptions(["route.*", "delivery.*"], ["delivery.*", "route.*"]),
    ).toBe(true);
    expect(
      sameSubscriptions(
        ["document.*"],
        ["proof.*", "delivery.*", "occurrence.*"],
      ),
    ).toBe(true);
    expect(sameSubscriptions(["route.*"], ["route.*", "delivery.*"])).toBe(
      false,
    );
  });
});

describe("the webhook form's rules", () => {
  const valid = {
    name: "ERP do embarcador",
    url: "https://erp.exemplo.com.br/hook",
    topics: ["route.*"],
    is_active: true,
  };

  it("trims the name and the URL it sends", () => {
    expect(
      validateWebhookForm({
        ...valid,
        name: "  ERP  ",
        url: " https://erp.exemplo.com.br/hook ",
      }).values,
    ).toMatchObject({ name: "ERP", url: "https://erp.exemplo.com.br/hook" });
  });

  it("refuses what the API would refuse, one message per field", () => {
    const { errors } = validateWebhookForm({
      name: "E",
      url: "http://erp.exemplo.com.br",
      topics: [],
      is_active: true,
    });

    expect(errors).toMatchObject({
      name: expect.stringMatching(/dois caracteres/),
      url: expect.stringMatching(/Só https/),
      topics: expect.stringMatching(/ao menos um evento/),
    });
  });

  it("caps the URL at 2,048 characters", () => {
    const base = "https://erp.exemplo.com.br/";

    expect(
      validateWebhookForm({
        ...valid,
        url: base + "a".repeat(2048 - base.length),
      }).errors,
    ).toBeNull();
    expect(
      validateWebhookForm({
        ...valid,
        url: base + "a".repeat(2049 - base.length),
      }).errors?.url,
    ).toMatch(/2\.048/);
  });

  it("refuses credentials and addresses that can never receive", () => {
    expect(
      validateWebhookForm({ ...valid, url: "https://u:p@erp.exemplo.com.br" })
        .errors?.url,
    ).toMatch(/usuário e senha/);

    for (const host of [
      "localhost",
      "erp.local",
      "api.internal",
      "127.0.0.1",
      "10.1.2.3",
      "172.20.0.1",
      "192.168.0.10",
      "169.254.169.254",
      "[::1]",
      "[fd00::1]",
    ]) {
      expect(isUnreachableHost(host), host).toBe(true);
    }

    for (const host of [
      "erp.exemplo.com.br",
      "8.8.8.8",
      "172.32.0.1",
      "[2606:4700::1111]",
    ]) {
      expect(isUnreachableHost(host), host).toBe(false);
    }
  });
});

describe("subscriptions the checkboxes cannot express (DLVB-22)", () => {
  const WILDCARDS = ["delivery.*", "occurrence.*", "proof.*"];

  it("singles out a family prefix held without the rest of the family", () => {
    expect(partialWildcards(["delivery.*"], WILDCARDS)).toEqual(["delivery.*"]);
    expect(
      partialWildcards(["delivery.*", "proof.*", "route.*"], WILDCARDS),
    ).toEqual(["delivery.*", "proof.*"]);

    // The whole family is "Todos os eventos", not three loose prefixes.
    expect(partialWildcards([...WILDCARDS], WILDCARDS)).toEqual([]);
    expect(partialWildcards(["delivery.created"], WILDCARDS)).toEqual([]);
  });

  it("names what the catalogue does not know, and removes one entry", () => {
    const knownTopics = DOCUMENTS.map((entry) => entry.topic);
    const knownWildcards = [...WILDCARDS, "route.*"];

    expect(
      unknownSubscriptions(
        ["route.*", "delivery.created", "vehicle.moved", "document.*"],
        knownTopics,
        knownWildcards,
      ),
    ).toEqual(["vehicle.moved", "document.*"]);

    expect(
      removeSubscription(["route.*", "vehicle.moved"], "vehicle.moved"),
    ).toEqual(["route.*"]);
  });
});

describe("hosts the API accepts are not refused by the form (DLVB-24 mirror)", () => {
  it("judges a mapped IPv6 by the IPv4 it carries, as the API does", () => {
    // What the URL parser hands over: `[::ffff:8.8.8.8]` becomes ::ffff:808:808.
    const hostOf = (url: string) => new URL(url).hostname;

    expect(isUnreachableHost(hostOf("https://[::ffff:8.8.8.8]/"))).toBe(false);
    expect(
      validateWebhookForm({
        name: "ERP",
        url: "https://[::ffff:8.8.8.8]/hook",
        topics: ["route.*"],
        is_active: true,
      }).errors,
    ).toBeNull();

    for (const url of [
      "https://[::ffff:10.0.0.5]/",
      "https://[::ffff:127.0.0.1]/",
      "https://[::ffff:0:10.0.0.5]/",
      "https://[::127.0.0.1]/",
      "https://[::ffff:169.254.169.254]/",
    ]) {
      expect(isUnreachableHost(hostOf(url)), url).toBe(true);
    }
  });

  it("refuses the ranges and names the API refuses at save", () => {
    for (const host of [
      "198.18.0.1",
      "224.0.0.1",
      "240.0.0.1",
      "instance-data",
    ]) {
      expect(isUnreachableHost(host), host).toBe(true);
    }

    expect(isUnreachableHost("198.20.0.1")).toBe(false);
  });
});
