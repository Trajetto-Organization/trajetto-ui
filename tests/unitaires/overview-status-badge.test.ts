import { describe, expect, it } from "vitest";

import { renderHtml } from "./helpers/render-html";

import { getStatusBadge } from "@/app/(protected)/_components/overview-dashboard/status-badge";
import {
  activityStatusClass,
  activityStatusLabel,
} from "@/features/activity/lib/activity-catalog";

/**
 * The status column of the overview's recent activity (FLEET-ACT-2).
 *
 * It kept a fourth copy of the status map, with nine of the trail's statuses:
 * the route and proof rows ("Planejada", "Liberada", "Aprovado"…) fell into
 * the grey of the unknown, and a legacy "PLANNED" was printed raw. The
 * activity catalog is the one source the table and the timeline read.
 */
describe("the overview's activity status badge", () => {
  it.each([
    ["PLANNED", "Planejada"],
    ["Em Rota", "Em rota"],
    ["Liberada", "Liberada"],
    ["APPROVED", "Aprovado"],
    ["Criado", "Criado"],
  ])("reads %s as %s, in the catalog's tone", (stored, label) => {
    const html = renderHtml(getStatusBadge(stored));

    expect(html).toContain(`>${label}<`);

    for (const token of activityStatusClass(stored).split(" ")) {
      expect(html).toContain(token);
    }

    expect(activityStatusLabel(stored)).toBe(label);
  });

  it("keeps an unknown status as it came, in the neutral tone", () => {
    const html = renderHtml(getStatusBadge("Algo novo"));

    expect(html).toContain(">Algo novo<");
    expect(html).toContain("bg-gray-100");
  });
});
