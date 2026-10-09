import { createElement } from "react";
import { renderHtml } from "./helpers/render-html";

import { describe, expect, it, vi } from "vitest";

/**
 * The link from one Entregas tab to another (decision 8.8, table-infra §6.1).
 *
 * The strip copied the whole URL and removed only page and search. The
 * deliveries and occurrences tables now keep their sort and facet filters
 * in the URL, so leaving Ocorrências sorted by type and filtered to
 * "Impeditiva" opened Entregas with `sort=typeName&severity=blocking` — a
 * sort key list-delivery refuses with a 400, and a filter that is not its.
 */
const current = vi.hoisted(() => ({ query: "" }));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(current.query),
}));

vi.mock("@/features/deliveries/chat/lib/use-chat-unread", () => ({
  useChatUnreadCount: () => 0,
  useTicketsSummary: () => null,
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
      tab: "occurrences",
      page: "3",
      search: "nf",
      sort: "typeName",
      order: "desc",
      severity: "blocking",
      occurrenceTypeId: "018f0000-0000-7000-8000-0000000000aa",
      deliveryStatus: "FAILED",
    }).toString();

    const html = renderHtml(
      createElement(DeliveriesTabs, { activeTab: "occurrences" }),
    );

    const next = hrefOf(html, "deliveries");

    expect(Object.fromEntries(next)).toEqual({
      businessId: COMPANY,
      pageSize: "20",
      tab: "deliveries",
    });
  });

  it("keeps the open tab's own URL, so clicking it again wipes nothing", () => {
    current.query = "tab=deliveries&sort=status&order=asc&status=PENDING";

    const html = renderHtml(
      createElement(DeliveriesTabs, { activeTab: "deliveries" }),
    );

    expect(Object.fromEntries(hrefOf(html, "deliveries"))).toEqual({
      tab: "deliveries",
      sort: "status",
      order: "asc",
      status: "PENDING",
    });
  });
});

describe("deliveryTabHref", () => {
  it("drops a chat deep link when leaving the chat", () => {
    const href = deliveryTabHref(
      new URLSearchParams("tab=chat&chatDriver=d1&chatDelivery=x&businessId=b"),
      "chat",
      "monitoring",
    );

    expect(href).toBe("?businessId=b&tab=monitoring");
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
