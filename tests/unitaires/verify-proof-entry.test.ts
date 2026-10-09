import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  parseVerificationCode,
  resolveVerificationTarget,
} from "@/app/verificar/_lib/verification-code";

import { inTimeZone } from "./helpers/in-time-zone";

/**
 * The public verification of a proof PDF (Entregas 11; DLVB-10).
 *
 * The PDF prints the address under the QR for whoever types it, but
 * /verificar without a token was a 404, and a viewer that linked only the
 * first line of the wrapped address opened exactly that.
 */
const TOKEN =
  "9f1c2a4e6b8d0f3a5c7e9b1d3f5a7c9e9f1c2a4e6b8d0f3a5c7e9b1d3f5a7c9e";

describe("the code a person types on /verificar", () => {
  it("accepts the bare code, with spaces or in capitals", () => {
    expect(parseVerificationCode(TOKEN)).toBe(TOKEN);
    expect(parseVerificationCode(`  ${TOKEN.toUpperCase()}  `)).toBe(TOKEN);
    expect(parseVerificationCode(TOKEN.match(/.{1,8}/g)!.join(" "))).toBe(
      TOKEN,
    );
  });

  it("accepts the whole address, pasted as printed", () => {
    expect(
      parseVerificationCode(`https://app.trajetto.com.br/verificar/${TOKEN}`),
    ).toBe(TOKEN);
    expect(
      parseVerificationCode(`http://localhost:3000/verificar/${TOKEN}?x=1`),
    ).toBe(TOKEN);
  });

  it("accepts the address copied from the PDF, where it wraps over lines", () => {
    // The PDF wraps the address right after "verificar/", so a copy from a
    // PDF viewer carries a line break (or a space) at the wrap.
    const host = "https://app.trajetto.com.br";
    const half = TOKEN.length / 2;
    const lf = "\n";
    const crlf = "\r\n";

    expect(parseVerificationCode(host + "/verificar/" + lf + TOKEN)).toBe(
      TOKEN,
    );
    expect(parseVerificationCode(host + "/verificar/" + crlf + TOKEN)).toBe(
      TOKEN,
    );
    expect(parseVerificationCode(host + "/verificar/ " + TOKEN)).toBe(TOKEN);
    expect(
      parseVerificationCode(
        host + "/verificar/" + TOKEN.slice(0, half) + lf + TOKEN.slice(half),
      ),
    ).toBe(TOKEN);
    expect(
      parseVerificationCode(
        host +
          "/verifi" +
          crlf +
          "car/" +
          TOKEN.slice(0, half) +
          crlf +
          TOKEN.slice(half).toUpperCase(),
      ),
    ).toBe(TOKEN);
    expect(
      resolveVerificationTarget(host + "/verificar/" + lf + TOKEN),
    ).toEqual({
      kind: "redirect",
      path: "/verificar/" + TOKEN,
    });
  });

  it("accepts the address with the next line of the PDF selected along", () => {
    // The notice printed under the address starts with "Este" — a hex letter.
    // Glued to the token by the whitespace clean-up, it made a 65-character
    // code, and a triple-click or drag selection was refused.
    const host = "https://app.trajetto.com.br";
    const notice =
      "Este documento reúne informações registradas no momento da entrega";
    const half = TOKEN.length / 2;

    expect(parseVerificationCode(`${host}/verificar/${TOKEN}\n${notice}`)).toBe(
      TOKEN,
    );
    expect(
      parseVerificationCode(`${host}/verificar/\r\n${TOKEN}\r\n${notice}`),
    ).toBe(TOKEN);
    expect(
      parseVerificationCode(
        `${host}/verificar/${TOKEN.slice(0, half)}\n${TOKEN.slice(half)} ${notice}`,
      ),
    ).toBe(TOKEN);

    // The next line is not the code, whatever letter it starts with.
    expect(parseVerificationCode(`https://x/verificar/${TOKEN}\nf`)).toBe(
      TOKEN,
    );
  });

  it("refuses anything that is not exactly one token", () => {
    expect(parseVerificationCode("")).toBeNull();
    expect(parseVerificationCode(TOKEN.slice(1))).toBeNull();
    expect(parseVerificationCode(`${TOKEN}0`)).toBeNull();
    expect(parseVerificationCode(`${TOKEN} 0`)).toBeNull();
    expect(parseVerificationCode(`../../user/session?${TOKEN}`)).toBeNull();

    // A 65th hex character glued to the token is a longer code, a typo.
    expect(parseVerificationCode(`https://x/verificar/${TOKEN}f`)).toBeNull();

    // A token cut short, even with text after it.
    expect(
      parseVerificationCode(
        `https://x/verificar/${TOKEN.slice(0, 40)}\nEste documento`,
      ),
    ).toBeNull();
    expect(
      parseVerificationCode(`https://x/verificar/${TOKEN.slice(0, 63)}`),
    ).toBeNull();
  });

  it("sends a good code to the receipt's page and keeps a bad one on the form", () => {
    expect(resolveVerificationTarget(undefined)).toEqual({ kind: "empty" });
    expect(resolveVerificationTarget("   ")).toEqual({ kind: "empty" });

    expect(resolveVerificationTarget(TOKEN)).toEqual({
      kind: "redirect",
      path: `/verificar/${TOKEN}`,
    });

    expect(resolveVerificationTarget([TOKEN, "outro"])).toEqual({
      kind: "redirect",
      path: `/verificar/${TOKEN}`,
    });

    expect(resolveVerificationTarget("abc")).toEqual({
      kind: "invalid",
      input: "abc",
    });
  });
});

describe("the moments printed on the verification page", () => {
  it("are São Paulo's wall clock on a server running in UTC", async () => {
    // The page renders on the server and containers run in UTC (decision
    // 1.1): a delivery at 22:00 in São Paulo printed as 01:00 of the next day.
    const printed = await inTimeZone<string[]>(
      "UTC",
      {
        format: path.resolve(
          __dirname,
          "../../src/app/verificar/_lib/format-moment.ts",
        ),
      },
      `return [
        format.formatVerificationMoment("2026-09-17T01:00:00.000Z"),
        format.formatVerificationMoment(null),
        format.formatVerificationMoment("não é data"),
      ];`,
    );

    expect(printed[0].replace(/[  ]/g, " ")).toBe("16/09/2026, 22:00");
    expect(printed.slice(1)).toEqual(["—", "—"]);
  }, 30_000);
  it("are the carrier's own clock, named as the PDF names it, on a server in UTC", async () => {
    const printed = await inTimeZone<string[]>(
      "UTC",
      {
        format: path.resolve(
          __dirname,
          "../../src/app/verificar/_lib/format-moment.ts",
        ),
      },
      `return [
        format.formatVerificationMoment("2026-09-17T03:30:00.000Z", "America/Manaus"),
        format.verificationZoneCaption("America/Manaus", "2026-09-17T03:30:00.000Z"),
        format.verificationZoneCaption("America/Rio_Branco", "2026-09-17T03:30:00.000Z"),
        format.verificationZoneCaption(undefined, null),
      ];`,
    );

    expect(printed[0].replace(/[  ]/g, " ")).toBe("16/09/2026, 23:30");
    expect(printed.slice(1)).toEqual([
      "Horários de Manaus (UTC-4).",
      "Horários de Rio Branco (UTC-5).",
      "Horários de Brasília (UTC-3).",
    ]);
  }, 30_000);

  it("name every zone a company can pick", async () => {
    // The zones come from the business form's list, which mirrors the API's.
    const { BRAZILIAN_TIME_ZONES } =
      await import("@/app/(protected)/_components/admin/business/timezone-field/timezones");
    const { ZONE_NAMES } = await import("@/app/verificar/_lib/format-moment");

    expect(Object.keys(ZONE_NAMES).sort()).toEqual(
      [...BRAZILIAN_TIME_ZONES].sort(),
    );
  });
});
