// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { React, renderHtml } from "./helpers/render-html";

import { LogoMark } from "@/components/shared/logo-mark";
import { CtaBandMark } from "@/components/site/cta-band-mark";
import { SiteLogo } from "@/components/site/site-logo";

void React;

/**
 * The logo used to be a 1024px PNG, mostly empty canvas, cropped with CSS and
 * served through /_next/image with a blur placeholder: on /login it showed a
 * blurry pink halo and the word jumped when the bytes arrived, and the CTA
 * bands' mark popped in late. It is now one cropped vector file rendered by
 * one component, with its box reserved and no placeholder.
 */
const ROOT = resolve(__dirname, "../..");
const read = (path: string) => readFileSync(resolve(ROOT, path), "utf8");
const SVG_PATH = "src/assets/logo/trajetto-mark.svg";

const imgTags = (html: string) => html.match(/<img\b[^>]*>/g) ?? [];
const attr = (tag: string | undefined, name: string) =>
  tag?.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

describe("trajetto-mark.svg", () => {
  const svg = read(SVG_PATH);

  it("declares the cropped mark's size for the image loader", () => {
    expect(svg).toContain('viewBox="0 0 618 317"');
    expect(svg).toContain('width="618"');
    expect(svg).toContain('height="317"');
  });

  it("carries no script, inline style, handler or external reference", () => {
    expect(svg).not.toMatch(/<script/i);
    expect(svg).not.toContain("style=");
    expect(svg).not.toMatch(/\son\w+=/i);
    for (const [, target] of svg.matchAll(/href="([^"]*)"/g)) {
      expect(target.startsWith("#")).toBe(true);
    }
  });

  it("has unique gradient ids and every url(#id) resolves", () => {
    const ids = [...svg.matchAll(/\sid="([^"]+)"/g)].map(([, id]) => id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const [, ref] of svg.matchAll(/url\(#([^)]+)\)/g)) {
      expect(ids).toContain(ref);
    }
  });

  it("stays within 4 KB", () => {
    expect(Buffer.byteLength(svg)).toBeLessThanOrEqual(4096);
  });
});

describe("LogoMark", () => {
  it.each([34, 36, 22, 20, 374])("reserves its %ipx box", (width) => {
    const [tag, ...rest] = imgTags(renderHtml(<LogoMark width={width} />));

    expect(rest).toEqual([]);
    expect(attr(tag, "width")).toBe(String(width));
    expect(attr(tag, "height")).toBe(String(Math.round((width * 317) / 618)));
    expect(attr(tag, "class")).toContain("aspect-[618/317]");
    expect(attr(tag, "class")).toContain("h-auto");
    const src = attr(tag, "src") ?? "";
    expect(src).toContain("trajetto-mark");
    expect(src).toMatch(/\.svg$/);
    expect(tag).not.toMatch(/srcset/i);
    expect(tag).not.toContain("/_next/image");
    const style = attr(tag, "style") ?? "";
    expect(style).not.toContain("background-image");
    expect(style).not.toContain("blur");
    expect(attr(tag, "alt")).toBe("");
    expect(attr(tag, "aria-hidden")).toBe("true");
  });

  it("loads eagerly with high priority above the fold", () => {
    const [tag] = imgTags(renderHtml(<LogoMark width={34} priority />));

    expect(tag).not.toContain('loading="lazy"');
    expect(tag).toMatch(/fetchpriority="high"/i);
  });

  it("is lazy by default", () => {
    const [tag] = imgTags(renderHtml(<LogoMark width={34} />));

    expect(attr(tag, "loading")).toBe("lazy");
  });
});

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

const SOURCES = walk(resolve(ROOT, "src"))
  .filter((path) => path.endsWith(".tsx"))
  .map((path) => ({
    file: relative(ROOT, path).replace(/\\/g, "/"),
    text: readFileSync(path, "utf8"),
  }));

describe("no blur placeholder, no old PNG", () => {
  it("no component imports trajetto-logo.png", () => {
    const importers = SOURCES.filter(({ text }) =>
      text.includes("trajetto-logo.png"),
    ).map(({ file }) => file);

    expect(importers).toEqual([]);
  });

  it("no file that renders the mark sets a placeholder", () => {
    const offenders = SOURCES.filter(
      ({ text }) =>
        /trajetto-mark|logo-mark/.test(text) && text.includes("placeholder="),
    ).map(({ file }) => file);

    expect(offenders).toEqual([]);
  });
});

describe("every call site goes through the shared component", () => {
  it.each([
    "src/components/site/site-logo.tsx",
    "src/components/layouts/auth-layout/index.tsx",
    "src/app/(protected)/_components/layout/protected-trajetto-logo/index.tsx",
    "src/app/blog/[slug]/page.tsx",
  ])("%s renders LogoMark", (file) => {
    const text = read(file);

    expect(text).toMatch(
      /import \{ LogoMark \} from "@\/components\/shared\/logo-mark"/,
    );
    expect(text).not.toContain("trajetto-logo");
  });

  it.each([
    "src/components/about/cta.tsx",
    "src/components/site/home/panel-and-cta.tsx",
    "src/components/site/product/product-closing.tsx",
    "src/components/site/app-page/sections.tsx",
    "src/components/site/editorial/cta-band.tsx",
  ])("%s renders CtaBandMark", (file) => {
    const text = read(file);

    expect(text).toMatch(
      /import \{ CtaBandMark \} from "@\/components\/site\/cta-band-mark"/,
    );
    expect(text).not.toContain("next/image");
    expect(text).not.toContain("trajetto-logo");
  });

  it.each([
    "src/app/(protected)/_components/layout/protected-default-layout/index.tsx",
    "src/app/(protected)/_components/layout/protected-driver-layout/index.tsx",
  ])("%s does not squash the mark into a square", (file) => {
    const text = read(file);

    expect(text).not.toMatch(/<ProtectedTrajettoLogo className="size-4"/);
    expect(text).not.toMatch(/<company\.logo className="size-4"/);
  });
});

describe("SiteLogo", () => {
  it("renders the mark directly, without a cropping window", () => {
    const html = renderHtml(<SiteLogo />);
    const tags = imgTags(html);

    expect(tags).toHaveLength(1);
    expect(attr(tags[0], "width")).toBe("34");
    expect(html).not.toContain("overflow-hidden");
    expect(html).toContain("Trajetto");
    expect(attr(tags[0], "loading")).not.toBe("lazy");
  });

  it("is lazy with priority={false} (the footer)", () => {
    const [tag] = imgTags(renderHtml(<SiteLogo priority={false} />));

    expect(attr(tag, "loading")).toBe("lazy");
  });
});

describe("CtaBandMark", () => {
  it("is a decorative backdrop that stays whole below 1200px and hides below 640px", () => {
    const [tag] = imgTags(renderHtml(<CtaBandMark />));

    expect(attr(tag, "aria-hidden")).toBe("true");
    expect(attr(tag, "alt")).toBe("");
    const cls = attr(tag, "class") ?? "";
    expect(cls).toContain("pointer-events-none");
    expect(cls).toContain("max-[1199px]:bottom-4");
    expect(cls).toContain("max-[1199px]:right-5");
    expect(cls).toContain("max-[1199px]:top-auto");
    expect(cls).toContain(
      "max-[1199px]:w-[clamp(96px,calc(100%_-_6vw_-_460px),220px)]",
    );
    expect(cls).toContain("max-[639px]:hidden");
    // Negative offsets below 1200px crop the mark into stripes.
    expect(cls).not.toMatch(/max-\[1199px\]:(bottom|right)-\[-/);
  });
});
