// @vitest-environment node
import type { ReactElement, ReactNode } from "react";

import { afterEach, describe, expect, it, vi } from "vitest";

import { loadAllPosts } from "@/lib/content/blog";

// Puts React in scope for the route's JSX (see the helper).
import "./helpers/render-html";

/**
 * The social card of each post (decision 10.3): text only, drawn from the
 * post's own title and category.
 *
 * `next/og` rasterizes with a font it locates through `import.meta.url`,
 * which Vitest rewrites on Windows; the PNG encoding is Next's job, so the
 * test captures what the route hands to ImageResponse and checks that.
 */
const captured: Array<{ element: ReactElement; options: unknown }> = [];

vi.mock("next/og", () => ({
  ImageResponse: class {
    constructor(element: ReactElement, options: unknown) {
      captured.push({ element, options });
    }
  },
}));

function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean")
    return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join(" ");

  const element = node as ReactElement<{ children?: ReactNode }>;
  return textOf(element.props?.children);
}

function tagsOf(node: ReactNode): string[] {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(tagsOf);

  const element = node as ReactElement<{ children?: ReactNode }>;
  return [String(element.type), ...tagsOf(element.props?.children)];
}

afterEach(() => {
  vi.unstubAllEnvs();
  captured.length = 0;
});

describe("blog/[slug]/opengraph-image", () => {
  it("is a 1200x630 PNG per post with its title and category, and no image", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("METADATA_BASE", "https://www.intrajetto.com");

    const route = await import("@/app/blog/[slug]/opengraph-image");

    expect(route.size).toEqual({ width: 1200, height: 630 });
    expect(route.contentType).toBe("image/png");

    const posts = loadAllPosts();
    expect(posts.length).toBeGreaterThan(0);

    for (const post of posts) {
      route.default({ params: { slug: post.slug } });

      const { element, options } = captured.at(-1)!;
      const text = textOf(element);

      expect(options).toEqual(route.size);
      expect(text).toContain(post.title);
      expect(text).toContain(post.category.title);
      expect(text).toContain("www.intrajetto.com");
      expect(tagsOf(element)).not.toContain("img");
    }
  });

  it("is a not-found for a slug with no post", async () => {
    vi.stubEnv("NODE_ENV", "development");

    const route = await import("@/app/blog/[slug]/opengraph-image");

    expect(() => route.default({ params: { slug: "nao-existe" } })).toThrow(
      expect.objectContaining({ digest: "NEXT_NOT_FOUND" }),
    );
  });

  it("is rendered on request, never while building", async () => {
    // next/og in Next 14 cannot load its font on Windows: a card
    // prerendered by `next build` would fail every local Windows build.
    const route = await import("@/app/blog/[slug]/opengraph-image");

    expect(route).not.toHaveProperty("generateStaticParams");
  });

  it("cuts a title that would overflow the card", async () => {
    vi.stubEnv("NODE_ENV", "development");

    const blog = await import("@/lib/content/blog");
    const route = await import("@/app/blog/[slug]/opengraph-image");

    const [post] = blog.loadAllPosts();
    const spy = vi
      .spyOn(blog, "getPost")
      .mockReturnValue({ ...post, title: "Palavra ".repeat(40).trim() });

    route.default({ params: { slug: post.slug } });
    spy.mockRestore();

    const text = textOf(captured.at(-1)!.element);
    expect(text).toMatch(/…/);
    expect(text).not.toContain("Palavra ".repeat(20));
  });
});
