import { createElement } from "react";
import { renderHtml } from "./helpers/render-html";

import { describe, expect, it, vi } from "vitest";

/**
 * The link from one Entregas tab to another (decision 8.8, table-infra §6.1).
 *
 * The strip copied the whole URL and removed only page and search. The
 * tables keep their sort, facet filters and — on Entregas — the period in
 * the URL, so leaving Tipos de Ocorrência sorted and filtered opened
 * Entregas with a sort key list-delivery refuses with a 400, and a filter
 * that is not its.
 */
const current = vi.hoisted(() => ({ query: "" }));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(current.query),
}));

import { DeliveriesTabs } from "@/features/deliveries/tabs";
import { deliveryTabHref } from "@/features/deliveries/lib/tabs";

const COMPANY = "018f0000-0000-7000-8000-00000000c0de";

/** The href the rendered strip gives a tab, decoded from the markup. */
function hrefOf(html: string, tab: string): URLSearchParams {
  // The desktop rail's <a>, whatever order its attributes come in.
  const tag = html
    .match(/<a\s[^>]*>/g)
    ?.find((candidate) =>
      candidate.includes(`data-tutorial="deliveries-tab-${tab}"`),
    );
  const href = tag?.match(/href="([^"]*)"/)?.[1];

  if (href === undefined) throw new Error(`no link for ${tab}`);

  return new URLSearchParams(href.replace(/&amp;/g, "&").replace(/^\?/, ""));
}

describe("the Entregas strip", () => {
  it("leaves the table's sort, filters and page behind when it opens another tab", () => {
    current.query = new URLSearchParams({
      businessId: COMPANY,
      pageSize: "20",
      tab: "occurrence-types",
      page: "3",
      search: "nf",
      sort: "name",
      order: "desc",
      category: "NOT_DELIVERED",
      is_active: "true",
    }).toString();

    const html = renderHtml(
      createElement(DeliveriesTabs, { activeTab: "occurrence-types" }),
    );

    const next = hrefOf(html, "deliveries");

    expect(Object.fromEntries(next)).toEqual({
      businessId: COMPANY,
      pageSize: "20",
      tab: "deliveries",
    });
  });

  it("keeps the open tab's own URL, so clicking it again wipes nothing", () => {
    current.query =
      "tab=deliveries&sort=status&order=asc&status=PENDING&period=7d&kind=SERVICE_ORDER";

    const html = renderHtml(
      createElement(DeliveriesTabs, { activeTab: "deliveries" }),
    );

    expect(Object.fromEntries(hrefOf(html, "deliveries"))).toEqual({
      tab: "deliveries",
      sort: "status",
      order: "asc",
      status: "PENDING",
      period: "7d",
      kind: "SERVICE_ORDER",
    });

    // The period belongs to the deliveries table, not to the next tab.
    expect(Object.fromEntries(hrefOf(html, "shippers"))).toEqual({
      tab: "shippers",
    });
  });

  it("draws only the registrations: the operation moved to the Torre", () => {
    current.query = "";

    const html = renderHtml(
      createElement(DeliveriesTabs, { activeTab: "deliveries" }),
    );

    for (const tab of [
      "deliveries",
      "shippers",
      "imports",
      "occurrence-types",
      "status-change-reasons",
      "message-templates",
    ]) {
      expect(() => hrefOf(html, tab), tab).not.toThrow();
    }

    for (const moved of ["monitoring", "occurrences", "chat", "proof-audits"]) {
      expect(() => hrefOf(html, moved), moved).toThrow();
    }
  });
});

describe("deliveryTabHref", () => {
  it("drops the deliveries' filters and period when leaving them", () => {
    const href = deliveryTabHref(
      new URLSearchParams(
        "tab=deliveries&period=custom&from=2026-10-01&to=2026-10-02&businessId=b",
      ),
      "deliveries",
      "imports",
    );

    expect(href).toBe("?businessId=b&tab=imports");
  });

  it("cleans the fallback tab's link when the URL named a tab it may not open", () => {
    // A read-only profile follows a link to Tipos de Ocorrência: the page
    // falls back to Entregas, and the sort and facet of the tab it could not
    // open must not ride along on the Entregas link.
    const href = deliveryTabHref(
      new URLSearchParams(
        "businessId=b&tab=occurrence-types&sort=typeName&severity=blocking&page=2",
      ),
      "deliveries",
      "deliveries",
    );

    expect(href).toBe("?businessId=b&tab=deliveries");
  });

  it("names the tab even when the open one came from no param", () => {
    expect(
      deliveryTabHref(new URLSearchParams(""), "deliveries", "deliveries"),
    ).toBe("?tab=deliveries");
  });
});
