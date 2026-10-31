import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import NextTopLoader from "nextjs-toploader";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

// Puts React in scope for the classic-runtime JSX of the modules below.
import { React } from "./helpers/render-html";

import { BlogExplorer } from "@/components/blog/blog-explorer";
import { getBlogCategories, getPosts } from "@/lib/content/blog";

void React;

/**
 * The blog's filters and pages against the real top loader.
 *
 * The chips and the page numbers are links (a middle click opens them in a
 * tab), filtered in the page: the click is intercepted and the URL replaced.
 * The top loader starts its bar on the click of any link to another URL and
 * finished it only on history.pushState (nextjs-toploader 1.6): the URL
 * changed through replaceState, so the bar crawled and the spinner turned
 * for good. Now the loader also finishes on replaceState (3.x), and a
 * click writes the URL on the next task instead of after the typing delay.
 */

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

const posts = getPosts();
const categories = getBlogCategories();

let host: HTMLDivElement;
let root: Root;

const bar = () => document.getElementById("nprogress");

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

beforeEach(async () => {
  vi.useFakeTimers();
  window.history.replaceState(null, "", "/blog");

  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => {
    root.render(
      <>
        <NextTopLoader showSpinner />
        <BlogExplorer posts={posts} categories={categories} intro={null} />
      </>,
    );
  });
});

afterEach(async () => {
  // NProgress is one module-wide bar: a test that left it running would
  // carry it into the next. A URL change finishes it, as in the page.
  await act(async () => {
    window.history.replaceState(null, "", "/blog");
    vi.advanceTimersByTime(1_000);
  });
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
});

/** A plain left click, as the browser dispatches it. */
async function click(element: Element) {
  await act(async () => {
    element.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }),
    );
  });
}

async function advance(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
}

function chip(title: string): HTMLAnchorElement {
  const found = [
    ...host.querySelectorAll<HTMLAnchorElement>(
      'nav[aria-label="Filtrar por categoria"] a',
    ),
  ].find((anchor) => anchor.textContent?.includes(title));

  expect(found, `chip ${title}`).toBeDefined();

  return found as HTMLAnchorElement;
}

describe("a filter chip", () => {
  it("finishes the top loader's bar right after the click", async () => {
    const category = categories.find((each) => each.count > 0);

    expect(category).toBeDefined();

    await click(chip(category!.title));

    // The loader saw a link to another URL: the bar started.
    expect(bar()).not.toBeNull();

    // The URL is written on the next task, and that finishes the bar.
    await advance(0);
    expect(window.location.search).toBe(`?category=${category!.slug}`);

    await advance(1_000);
    expect(bar()).toBeNull();
    expect(document.documentElement.classList.contains("nprogress-busy")).toBe(
      false,
    );
  });

  it("filters in the page: the link is not followed", async () => {
    const category = categories.find((each) => each.count > 0)!;
    const anchor = chip(category.title);

    expect(anchor.getAttribute("href")).toBe(`/blog?category=${category.slug}`);

    await click(anchor);
    await advance(0);

    expect(anchor.getAttribute("aria-current")).toBe("true");
    expect(window.location.pathname).toBe("/blog");
  });

  it("back to Todos finishes the bar too", async () => {
    const category = categories.find((each) => each.count > 0)!;

    await click(chip(category.title));
    await advance(1_000);

    await click(chip("Todos"));
    await advance(0);
    expect(window.location.search).toBe("");

    await advance(1_000);
    expect(bar()).toBeNull();
  });
});

describe("the search box", () => {
  it("keeps the URL waiting while typing, and starts no bar", async () => {
    const input = host.querySelector<HTMLInputElement>('input[type="search"]');

    expect(input).not.toBeNull();

    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set;

      setValue?.call(input, "frota");
      input!.dispatchEvent(new Event("input", { bubbles: true }));
    });

    await advance(299);
    expect(window.location.search).toBe("");
    expect(bar()).toBeNull();

    await advance(1);
    expect(window.location.search).toBe("?q=frota");
  });
});

describe("the top loader itself", () => {
  // The integration the blog relies on, in case a downgrade comes back.
  it("finishes on history.replaceState, not only on pushState", async () => {
    const link = document.createElement("a");

    link.href = "/elsewhere";
    link.addEventListener("click", (event) => event.preventDefault());
    document.body.appendChild(link);

    try {
      await click(link);
      expect(bar()).not.toBeNull();

      await act(async () => {
        window.history.replaceState(null, "", "/blog?replaced=1");
      });
      await advance(1_000);

      expect(bar()).toBeNull();
    } finally {
      link.remove();
    }
  });
});
