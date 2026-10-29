import type { Metadata } from "next";

import { Download, ExternalLink } from "lucide-react";

import { siteButtonClass } from "@/components/site/arrow-link";
import { Eyebrow } from "@/components/site/primitives";
import { buildPageMetadata } from "@/lib/page-metadata";
import { cn } from "@/lib/utils";

import { DocsPager } from "../_components/docs-pager";
import { DocsToc } from "../_components/docs-toc";
import {
  DOCS_CARD,
  DOCS_INLINE_CODE,
  DOCS_LEAD,
  DOCS_TITLE,
} from "../_components/docs-type";
import {
  ReferenceView,
  referenceToc,
} from "../_components/reference/reference-view";
import { SpecUnavailableNotice } from "../_components/reference/spec-unavailable-notice";
import { Markdown } from "../_lib/markdown";
import { DOCS_CONSOLE_PATH, DOCS_REFERENCE_PATH } from "../_lib/navigation";
import { SPEC_PATH, fetchPublicSpec, publicApiUrl } from "../_lib/public-spec";
import { specProseComponents } from "../_components/spec-prose";

// Per request, over Next's data cache: the reference is the API's live
// document, never a copy made at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  path: DOCS_REFERENCE_PATH,
  title: "Referência da API",
  description:
    "Todos os endpoints e webhooks da API de Integração do Trajetto: parâmetros, corpos, respostas, erros e exemplos.",
});

const OUTLINE_BUTTON = siteButtonClass({
  variant: "secondary",
  size: "sm",
  className: "w-full sm:w-auto",
});

/** The label of a fact card (the site's small mono label). */
const TERM =
  "font-site-mono text-[11px] font-medium tracking-[.12em] text-site-muted";

const ReferencePage = async () => {
  const spec = await fetchPublicSpec();
  const apiUrl = publicApiUrl(spec);
  const specUrl = apiUrl ? `${apiUrl}${SPEC_PATH}` : null;

  return (
    <div className="flex gap-10">
      <article className="min-w-0 flex-1 py-10 [--acc:var(--site-pink)] min-[960px]:pl-10 xl:max-w-4xl">
        <header className="border-b border-site-line pb-8">
          <Eyebrow className="mb-4">REFERÊNCIA</Eyebrow>
          <h1 className={DOCS_TITLE}>Referência da API</h1>
          <p className={DOCS_LEAD}>
            Gerada a partir do documento OpenAPI que a própria API publica: o
            que está aqui é o que ela responde.
            {spec
              ? ` Versão ${spec.info.version ?? "v1"}, OpenAPI ${spec.openapi}.`
              : ""}
          </p>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            {specUrl ? (
              <a href={specUrl} className={OUTLINE_BUTTON}>
                <Download aria-hidden className="size-4" />
                Baixar openapi.json
              </a>
            ) : null}
            <a
              href={DOCS_CONSOLE_PATH}
              target="_blank"
              rel="noopener noreferrer"
              className={OUTLINE_BUTTON}
            >
              <ExternalLink aria-hidden className="size-4" />
              Console interativo
              <span className="sr-only"> (abre em nova aba)</span>
            </a>
          </div>

          {spec ? (
            <dl className="mt-8 grid gap-3 text-sm sm:grid-cols-2">
              <div className={cn(DOCS_CARD, "px-5 py-[18px]")}>
                <dt className={TERM}>ENDEREÇO BASE</dt>
                <dd className="mt-2 break-all font-site-mono text-[13px] text-site-ink">
                  {spec.servers?.[0]?.url ?? "o endereço da API da sua empresa"}
                </dd>
              </div>
              <div className={cn(DOCS_CARD, "px-5 py-[18px]")}>
                <dt className={TERM}>AUTENTICAÇÃO</dt>
                <dd className="mt-2">
                  <code
                    className={cn(
                      DOCS_INLINE_CODE,
                      "mb-2 inline-block break-all",
                    )}
                  >
                    Authorization: Bearer &lt;chave&gt;
                  </code>
                  <Markdown
                    source={
                      spec.components?.securitySchemes?.apiKey?.description
                    }
                    components={specProseComponents}
                  />
                </dd>
              </div>
            </dl>
          ) : null}
        </header>

        {spec ? (
          <ReferenceView
            spec={spec}
            serverUrl={spec.servers?.[0]?.url ?? apiUrl ?? ""}
          />
        ) : (
          <SpecUnavailableNotice specUrl={specUrl} />
        )}

        <DocsPager href={DOCS_REFERENCE_PATH} />
      </article>

      {spec ? (
        // A column, not an <aside>: one complementary landmark per page (the
        // sidebar's); the nav inside is named "Nesta página".
        <div className="sticky top-[70px] hidden h-[calc(100vh-70px)] w-60 shrink-0 overflow-y-auto overscroll-contain py-10 xl:block">
          <DocsToc items={referenceToc(spec)} />
        </div>
      ) : null}
    </div>
  );
};

export default ReferencePage;
