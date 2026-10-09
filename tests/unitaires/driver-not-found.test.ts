import * as React from "react";
import { renderHtml } from "./helpers/render-html";

import { describe, expect, it } from "vitest";

import DriverNotFound from "@/app/(protected)/driver/[...not-found]/page";

/**
 * The driver's 404 (label in name, WCAG 2.5.3).
 *
 * The way back carried aria-label="Back to notifications page": a screen
 * reader announced English, and a voice command saying the visible
 * "Voltar para o meu perfil" matched nothing.
 */
describe("the driver's 404", () => {
  it("names the way back with the text it shows", async () => {
    const html = renderHtml(await DriverNotFound());

    const link = /<a\b[^>]*href="\/profile"[^>]*>([\s\S]*?)<\/a>/.exec(html);

    expect(link, "link back to the profile").not.toBeNull();
    expect(link![0]).not.toMatch(/aria-label=/);
    expect(link![1].replace(/<[^>]+>/g, "")).toContain(
      "Voltar para o meu perfil",
    );
  });
});
