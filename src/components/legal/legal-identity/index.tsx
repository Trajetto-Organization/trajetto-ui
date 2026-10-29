import { Building2 } from "lucide-react";

import { Placeholder } from "@/components/legal/legal-prose";
import { siteConfig } from "@/lib/site";

/**
 * Who is responsible for the data. Only what is on record is filled in
 * (decision 10.2); the rest stays visibly blank until the owner provides it,
 * because an invented CNPJ or address would be a false statement.
 */
const FIELDS: { label: string; value?: string; pending?: string }[] = [
  { label: "Controlador", value: siteConfig.legalName },
  { label: "CNPJ", pending: "inscrição no cadastro nacional" },
  { label: "Endereço", pending: "sede, com CEP" },
  { label: "Contato", value: siteConfig.email },
  { label: "Encarregado (DPO)", pending: "nome e canal do encarregado" },
  { label: "Foro", pending: "comarca eleita" },
];

const LegalIdentity = () => {
  const hasPending = FIELDS.some((field) => field.pending);

  return (
    <section
      aria-labelledby="identificacao-titulo"
      id="identificacao"
      className="mb-10 scroll-mt-[110px] rounded-[22px] border border-site-line bg-site-surface p-[clamp(20px,3vw,28px)]"
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex size-[38px] shrink-0 items-center justify-center rounded-[11px] bg-site-soft2"
        >
          <Building2 className="size-[18px]" />
        </span>
        <h2 id="identificacao-titulo" className="m-0 text-base font-semibold">
          Identificação do responsável
        </h2>
      </div>

      <dl className="mb-0 mt-[18px] grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-x-8 gap-y-3.5">
        {FIELDS.map((field) => (
          <div key={field.label} className="flex min-w-0 flex-col gap-1">
            <dt className="text-[13px] font-semibold">{field.label}</dt>
            <dd className="m-0 text-sm text-site-muted [overflow-wrap:anywhere]">
              {field.value ?? (
                <Placeholder className="text-[13px]">
                  {field.pending}
                </Placeholder>
              )}
            </dd>
          </div>
        ))}
      </dl>

      {hasPending ? (
        <p className="mb-0 mt-4 text-[13px] leading-[1.6] text-site-muted">
          Os campos marcados como “a definir” serão preenchidos com os dados
          registrados da empresa. Até lá, pedidos sobre dados pessoais podem ser
          feitos pelo contato acima.
        </p>
      ) : null}
    </section>
  );
};

export { LegalIdentity };
