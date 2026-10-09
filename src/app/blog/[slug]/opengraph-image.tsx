import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";

import { getPost } from "@/lib/content/blog";
import { siteConfig, siteUrl } from "@/lib/site";

/**
 * The social card of each post (decision 10.3). Text only: the blog has no
 * images, the card is the one place a post gets a picture, and it is drawn
 * from the post's own title and category.
 *
 * Rendered on the first request and cached, not prerendered: Next 14's
 * next/og cannot load its bundled font on Windows (it path.join()s a file
 * URL), so a card generated during `next build` would break every local
 * Windows build. Production and CI run Linux, where it works.
 */
export const alt = "Artigo do blog do Trajetto";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Titles longer than this are cut with an ellipsis so they never overflow. */
const MAX_TITLE = 110;

export default function OpenGraphImage({
  params,
}: {
  params: { slug: string };
}) {
  const post = getPost(params.slug);

  // Unknown slugs and drafts in a build: no card, like no page.
  if (!post) notFound();

  const title = post.title;
  const clipped =
    title.length > MAX_TITLE
      ? `${title.slice(0, MAX_TITLE - 1).trimEnd()}…`
      : title;

  const color = post.category.color;
  const host = new URL(siteUrl()).host;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 80px",
        backgroundColor: "#0f172a",
        backgroundImage: `radial-gradient(circle at 0% 0%, ${color}66 0%, transparent 55%), radial-gradient(circle at 100% 100%, #7c3aed40 0%, transparent 50%)`,
        color: "#f8fafc",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            display: "flex",
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: color,
          }}
        />
        <div
          style={{
            display: "flex",
            fontSize: 26,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#cbd5e1",
          }}
        >
          {post.category.title}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          fontSize: clipped.length > 70 ? 56 : 68,
          fontWeight: 700,
          lineHeight: 1.15,
          letterSpacing: -1,
        }}
      >
        {clipped}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 28,
          color: "#cbd5e1",
        }}
      >
        <div style={{ display: "flex", gap: 12 }}>
          <span style={{ color: "#f8fafc", fontWeight: 700 }}>
            {siteConfig.name}
          </span>
          {/* One text node: satori wants a flex container for several. */}
          <span>{`· ${post.author}`}</span>
        </div>
        <div style={{ display: "flex" }}>{host}</div>
      </div>
    </div>,
    size,
  );
}
