import { Metadata } from "next";

import { Navbar } from "@/components/layouts/navbar";
import { Footer } from "@/components/layouts/footer";

import { PortableTextContent } from "@/components/blog/portable-text";

import { sanityFetch } from "@/sanity/fetch";
import { isSanityConfigured } from "@/sanity/env";

import { LEGAL_POLICY_QUERY, LEGAL_SLUGS_QUERY } from "@/sanity/queries";
import { parseRobots, type LegalPolicy } from "@/sanity/types";

interface LegalPolicyParams {
  params: { policy: string };
}

/** ISR: fallback de 1h; o gatilho principal é a tag `legal` via webhook. */
export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await sanityFetch<string[]>(
    LEGAL_SLUGS_QUERY,
    {},
    { tags: ["legal"] },
  );

  return (slugs ?? []).map((policy) => ({ policy }));
}

export async function generateMetadata({
  params,
}: LegalPolicyParams): Promise<Metadata> {
  const { policy } = params;

  const data = await sanityFetch<LegalPolicy>(
    LEGAL_POLICY_QUERY,
    { slug: policy },
    { tags: ["legal", `legal:${policy}`] },
  );

  if (!data) {
    return {
      title: "Política não encontrada",
      description: "A política solicitada não foi encontrada.",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: data.metaTitle || data.title,
    description: data.metaDescription || data.description,
    alternates: { canonical: `/legal/${data.slug}` },
    robots: parseRobots(data.robots),
  };
}

/** Estado 404/indisponível — preserva o visual da página legal. */
const NotFoundState = (): JSX.Element => (
  <>
    <Navbar />
    <div className="flex min-h-screen w-full flex-col items-center justify-center px-6 text-center">
      <p
        className="bg-gradient-to-br from-blue-500 to-indigo-600 bg-clip-text
        font-bold text-[120px] leading-none tracking-tighter text-transparent sm:text-[160px]"
      >
        404
      </p>
      <h1 className="mt-6 text-2xl font-bold tracking-tighter text-slate-800 sm:text-3xl">
        Política não encontrada
      </h1>
      <p className="mt-3 max-w-[38ch] text-[14px] leading-relaxed text-zinc-500">
        A política solicitada não foi encontrada ou foi removida.
      </p>
    </div>
    <Footer />
  </>
);

const LegalPolicyPage = async ({
  params,
}: LegalPolicyParams): Promise<JSX.Element> => {
  const { policy } = params;

  // Sanity ainda não conectado (placeholder de env) OU política inexistente:
  // mesmo estado amigável, sem notFound() — a página já sai noindex pelo
  // generateMetadata.
  if (!isSanityConfigured) return <NotFoundState />;

  const data = await sanityFetch<LegalPolicy>(
    LEGAL_POLICY_QUERY,
    { slug: policy },
    { tags: ["legal", `legal:${policy}`] },
  );

  if (!data) return <NotFoundState />;

  const formattedDate = data._updatedAt
    ? new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(data._updatedAt))
    : null;

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-3xl px-6 py-32 md:px-8">
        {/* Header */}
        <div className="mb-12 border-b border-zinc-200 pb-8">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-blue-600">
            Legal
          </span>
          <h1 className="mt-3 text-3xl font-bold tracking-tighter text-slate-800 sm:text-4xl">
            {data.title}
          </h1>
          {formattedDate ? (
            <p className="mt-2 text-[13px] text-zinc-400">
              Última atualização: {formattedDate}
            </p>
          ) : null}
        </div>

        {/* Content */}
        <div>
          <PortableTextContent value={data.content} />
        </div>

        {/* Footer divider */}
        <div className="mt-16 border-t border-zinc-200 pt-6">
          <p className="text-[12px] text-zinc-400">
            © {new Date().getFullYear()} Trajetto. Todos os direitos reservados.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default LegalPolicyPage;
