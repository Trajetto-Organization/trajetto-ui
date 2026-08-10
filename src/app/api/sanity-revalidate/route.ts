import { revalidateTag, revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { parseBody } from "next-sanity/webhook";

const secret = process.env.SANITY_WEBHOOK_SECRET;

// Tags alinhadas às usadas nas queries do app (ver src/sanity/queries.ts):
// listagem e posts usam a tag "blog" (+ "blog:<slug>" por post); páginas
// legais usam "legal" (+ "legal:<slug>").
const REVALIDATION_MAP = {
  blogPost: {
    tags: ["blog"],
    paths: ["/blog", "/sitemap.xml"],
    specificTag: (slug: string) => `blog:${slug}`,
    specificPath: (slug: string) => `/blog/${slug}`,
  },
  legalPolicy: {
    tags: ["legal"],
    paths: ["/sitemap.xml"],
    specificTag: (slug: string) => `legal:${slug}`,
    specificPath: (slug: string) => `/legal/${slug}`,
  },
  category: {
    tags: ["blog"],
    paths: ["/blog"],
  },
  author: {
    tags: ["blog"],
    paths: ["/blog"],
  },
};

export async function POST(req: NextRequest) {
  try {
    // Validação por assinatura HMAC: o Sanity assina o payload com o secret e
    // aqui verificamos. Sem secret configurado, `isValidSignature` vem `null`
    // → cai no 401 (fail-closed, nunca revalida sem autenticação).
    const { body, isValidSignature } = await parseBody<{
      _type: string;
      _id: string;
      slug?: { current: string };
      title?: string;
    }>(req, secret);

    if (!isValidSignature) {
      return NextResponse.json(
        { message: "Invalid signature" },
        { status: 401 },
      );
    }

    if (!body?._type) {
      return NextResponse.json(
        { message: "Missing document type" },
        { status: 400 },
      );
    }

    const config =
      REVALIDATION_MAP[body._type as keyof typeof REVALIDATION_MAP];

    if (!config) {
      return NextResponse.json(
        { message: `Unsupported document type: ${body._type}` },
        { status: 400 },
      );
    }

    const revalidated: string[] = [];

    for (const tag of config.tags) {
      revalidateTag(tag);
      revalidated.push(`tag:${tag}`);
    }

    for (const path of config.paths) {
      revalidatePath(path);
      revalidated.push(`path:${path}`);
    }

    // Tag + path do documento específico (post/política).
    const slug = body.slug?.current;
    if (slug && "specificTag" in config) {
      revalidateTag(config.specificTag(slug));
      revalidatePath(config.specificPath(slug));

      revalidated.push(
        `tag:${config.specificTag(slug)}`,
        `path:${config.specificPath(slug)}`,
      );
    }

    // Um post novo/editado pode aparecer na home (seção de últimos posts).
    if (body._type === "blogPost") {
      revalidatePath("/");
      revalidated.push("path:/");
    }

    console.log(`✅ [REVALIDATION] ${body._type}:`, revalidated.join(", "));

    return NextResponse.json({
      message: `Successfully revalidated ${body._type}`,
      revalidated,
    });
  } catch (error) {
    console.error("❌ [REVALIDATION] webhook falhou:", error);
    return NextResponse.json(
      { message: "Internal server error during revalidation" },
      { status: 500 },
    );
  }
}

// Health check — confirma que a rota está no ar e se o secret está setado.
export async function GET() {
  return NextResponse.json({
    status: "healthy",
    hasSecret: !!secret,
  });
}
