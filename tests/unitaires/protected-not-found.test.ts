import { renderHtml } from "./helpers/render-html";

import { describe, expect, it } from "vitest";

import AdminNotFound from "@/app/(protected)/admin/[...not-found]/page";
import DashboardNotFound from "@/app/(protected)/dashboard/[...not-found]/page";
import NotificationsNotFound from "@/app/(protected)/notifications/[...not-found]/page";
import ProfileNotFound from "@/app/(protected)/profile/[...not-found]/page";

/**
 * The /admin, /dashboard, /notifications and /profile 404s (label in name,
 * WCAG 2.5.3), like the driver's (driver-not-found.test.ts).
 *
 * The way back carried aria-label="Back to dashboard page": a screen reader
 * announced English, and a voice command saying the visible Portuguese text
 * matched nothing.
 */
describe.each([
  // The /admin 404 said "administração" but led to /dashboard (reviewer note).
  ["/admin", AdminNotFound, "/admin", "Voltar para a página de administração"],
  ["/dashboard", DashboardNotFound, "/dashboard", "Voltar para o dashboard"],
  [
    "/notifications",
    NotificationsNotFound,
    "/notifications",
    "Voltar para a página de notificações",
  ],
  ["/profile", ProfileNotFound, "/profile", "Voltar para o seu perfil"],
] as const)("the %s 404", (_surface, NotFound, href, visible) => {
  it("names the way back with the text it shows", async () => {
    const html = renderHtml(await NotFound());

    const link = [...html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)].find(
      (match) => match[0].includes(`href="${href}"`),
    );

    expect(link, "link back").toBeDefined();
    expect(link![0]).not.toMatch(/aria-label=/);
    expect(link![1].replace(/<[^>]+>/g, "")).toContain(visible);
  });
});
