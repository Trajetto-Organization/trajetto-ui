import { CloudOff } from "lucide-react";

import { DOCS_CONSOLE_PATH } from "../../_lib/navigation";
import { DOCS_LINK } from "../docs-type";

/**
 * The reference when the API did not answer: say so, and point at the raw
 * document and the console instead of showing a copy that may be stale.
 */
const SpecUnavailableNotice = ({ specUrl }: { specUrl: string | null }) => (
  <div
    role="status"
    className="mt-10 flex flex-col items-center rounded-[22px] border border-dashed border-site-line2 bg-site-surface px-6 py-12 text-center"
  >
    <CloudOff className="size-10 text-site-muted" aria-hidden />
    <h2 className="mt-4 text-lg font-semibold text-site-ink">
      Referência indisponível agora
    </h2>
    <p className="mt-2 max-w-md text-sm leading-relaxed text-site-muted">
      A referência é lida da própria API a cada poucos minutos, e ela não
      respondeu desta vez. Tente de novo em instantes.
      {specUrl
        ? " Enquanto isso, o documento OpenAPI continua disponível para download."
        : ""}
    </p>
    <div className="mt-6 flex flex-col gap-2 sm:flex-row">
      {specUrl ? (
        <a href={specUrl} className={DOCS_LINK}>
          Abrir o openapi.json
        </a>
      ) : null}
      <a
        href={DOCS_CONSOLE_PATH}
        target="_blank"
        rel="noopener noreferrer"
        className={DOCS_LINK}
      >
        Abrir o console interativo
        <span className="sr-only"> (abre em nova aba)</span>
      </a>
    </div>
  </div>
);

export { SpecUnavailableNotice };
