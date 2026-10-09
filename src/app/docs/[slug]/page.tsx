import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { buildPageMetadata } from "@/lib/page-metadata";

import { GuidePage } from "../_components/guide-page";
import { getGuide } from "../_lib/guides";
import {
  API_DOCS_PATH,
  DOCS_INDEX_SLUG,
  docsGuideHref,
} from "../_lib/navigation";

interface DocsGuidePageProps {
  params: { slug: string };
}

// Per request, like the index: the guides read the API's live document.
export const dynamic = "force-dynamic";

export function generateMetadata({ params }: DocsGuidePageProps): Metadata {
  const guide = getGuide(params.slug);

  if (!guide)
    return { title: "Página não encontrada", robots: { index: false } };

  return buildPageMetadata({
    path: docsGuideHref(guide.slug),
    title: guide.title,
    description: guide.description,
  });
}

const DocsGuidePage = async ({ params }: DocsGuidePageProps) => {
  // The index guide lives at /docs; one address per page.
  if (params.slug === DOCS_INDEX_SLUG) permanentRedirect(API_DOCS_PATH);

  const guide = getGuide(params.slug);

  if (!guide) notFound();

  return <GuidePage guide={guide} />;
};

export default DocsGuidePage;
