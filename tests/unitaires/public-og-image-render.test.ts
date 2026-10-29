// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { loadAllPosts } from "@/lib/content/blog";

// Puts React in scope for the route's JSX (see the helper).
import "./helpers/render-html";

/**
 * The social card rasterized for real, through next/og with nothing mocked:
 * a style satori cannot draw fails here, not on the first share.
 *
 * Skipped on Windows only: Next 14's next/og finds its font with
 * path.join(import.meta.url, …), which breaks the file URL there. Linux (CI
 * and production) takes this path. The structure of the card is covered on
 * every platform in public-og-image.test.ts.
 */
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

afterEach(() => {
  vi.unstubAllEnvs();
});

describe.skipIf(process.platform === "win32")(
  "blog/[slug]/opengraph-image, rendered",
  () => {
    it("draws a 1200x630 PNG for every post", async () => {
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("METADATA_BASE", "https://www.intrajetto.com");

      const route = await import("@/app/blog/[slug]/opengraph-image");
      const posts = loadAllPosts();
      expect(posts.length).toBeGreaterThan(0);

      for (const post of posts) {
        const response = route.default({ params: { slug: post.slug } });
        // The PNG is encoded while the body is read; a drawing error shows here.
        const bytes = new Uint8Array(await response.arrayBuffer());
        const header = new DataView(bytes.buffer, bytes.byteOffset);

        expect(response.status, post.file).toBe(200);
        expect(response.headers.get("content-type")).toBe("image/png");
        expect([...bytes.slice(0, 8)]).toEqual(PNG_SIGNATURE);
        // IHDR: width and height, big-endian, right after the chunk header.
        expect([header.getUint32(16), header.getUint32(20)]).toEqual([
          1200, 630,
        ]);
      }
    });
  },
);
