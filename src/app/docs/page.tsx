import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { buildPageMetadata } from "@/lib/page-metadata";

import { GuidePage } from "./_components/guide-page";
import { getGuide } from "./_lib/guides";
import { API_DOCS_PATH, DOCS_INDEX_SLUG } from "./_lib/navigation";

// Rendered per request: the guides print numbers from the API's live
// document (Next's data cache keeps the API from being asked every time).
export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  const guide = getGuide(DOCS_INDEX_SLUG);

  return buildPageMetadata({
    path: API_DOCS_PATH,
    title: guide?.title ?? "Documentação da API",
    description:
      guide?.description ??
      "Guias e referência da API de Integração do Trajetto.",
  });
}

const DocsIndexPage = async () => {
  const guide = getGuide(DOCS_INDEX_SLUG);

  if (!guide) notFound();

  return <GuidePage guide={guide} />;
};

export default DocsIndexPage;
