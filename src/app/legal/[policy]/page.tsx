import { Footer } from "@/components/layouts/footer";
import { Navbar } from "@/components/layouts/navbar";

import { PortableText, type SanityDocument } from "next-sanity";

import { Metadata } from "next";
import { client } from "@/sanity/lib/client";

import { WhatsApp } from "@/components/home/whatsapp";
import Image from "next/image";

import { urlFor } from "@/sanity/lib/image";

const POLICY_QUERY = `*[_type == "legalPolicy" && slug.current == $slug][0]`;

interface LegalPolicyParams {
  params: { policy: string };
}

const getPolicyOptions = (slug: string) => ({
  cache: "force-cache" as const,
  next: {
    tags: ["legal-policies", `legal-policy-${slug}`],
  },
});

export async function generateMetadata({
  params,
}: LegalPolicyParams): Promise<Metadata> {
  const { policy } = params;

  try {
    const policyData = await client.fetch<SanityDocument>(
      POLICY_QUERY,
      { slug: policy },
      getPolicyOptions(policy),
    );

    if (!policyData) {
      return {
        title: "Política não encontrada",
        description: "A política solicitada não foi encontrada.",
        robots: "noindex, nofollow",
      };
    }

    return {
      title: policyData.metaTitle || policyData.title || "Política Legal",
      description:
        policyData.metaDescription ||
        policyData.description ||
        `Política legal: ${policyData.title}`,
      robots: policyData.robots || "index, follow",
    };
  } catch (error) {
    return {
      title: "Política Legal",
      description: "Política legal da Trajetto",
      robots: "index, follow",
    };
  }
}

const components = {
  types: {
    image: ({ value }: any) => {
      if (!value?.asset?._ref) {
        return null;
      }
      return (
        <div className="my-8">
          <Image
            src={urlFor(value)?.width(800).url() || ""}
            alt={value.alt || " "}
            width={800}
            height={450}
            className="rounded-lg w-full"
          />
        </div>
      );
    },
  },
  block: {
    h1: ({ children }: any) => (
      <h1 className="text-3xl font-bold mt-8 mb-4">{children}</h1>
    ),
    h2: ({ children }: any) => (
      <h2 className="text-2xl font-semibold mt-8 mb-4">{children}</h2>
    ),
    h3: ({ children }: any) => (
      <h3 className="text-xl font-semibold mt-6 mb-3">{children}</h3>
    ),
    h4: ({ children }: any) => (
      <h4 className="text-lg font-semibold mt-4 mb-2">{children}</h4>
    ),
    normal: ({ children }: any) => (
      <p className="mb-4 leading-relaxed text-muted-foreground">{children}</p>
    ),
    blockquote: ({ children }: any) => (
      <blockquote
        className="border-l-4 border-[#7c3aed] pl-4 py-2 my-6 
        italic bg-muted/30 rounded-r-lg"
      >
        {children}
      </blockquote>
    ),
  },
  list: {
    // List with bullets
    bullet: ({ children }: any) => (
      <ul
        className="list-disc pl-6 mb-6 space-y-2 
        marker:text-[#7c3aed]"
      >
        {children}
      </ul>
    ),
    // Numbered list
    number: ({ children }: any) => (
      <ol
        className="list-decimal pl-6 mb-6 space-y-2 
        marker:text-[#7c3aed] marker:font-semibold"
      >
        {children}
      </ol>
    ),
  },
  listItem: {
    bullet: ({ children }: any) => (
      <li className="mb-2 text-muted-foreground leading-relaxed">{children}</li>
    ),
    number: ({ children }: any) => (
      <li className="mb-2 text-muted-foreground leading-relaxed">{children}</li>
    ),
  },
  marks: {
    strong: ({ children }: any) => (
      <strong className="font-semibold text-foreground">{children}</strong>
    ),
    em: ({ children }: any) => <em className="italic">{children}</em>,
    underline: ({ children }: any) => (
      <span className="underline">{children}</span>
    ),
    code: ({ children }: any) => (
      <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-[#7c3aed]">
        {children}
      </code>
    ),
    link: ({ value, children }: any) => {
      const target = (value?.href || "").startsWith("http")
        ? "_blank"
        : undefined;
      return (
        <a
          href={value?.href}
          target={target}
          rel={target === "_blank" ? "noopener noreferrer" : undefined}
          className="text-[#7c3aed] hover:underline font-medium"
        >
          {children}
        </a>
      );
    },
    // Highlight mark
    highlight: ({ children }: any) => (
      <mark className="bg-yellow-200 dark:bg-yellow-900/50 px-1 rounded">
        {children}
      </mark>
    ),
  },
};

const LegalPolicy = async ({ params }: LegalPolicyParams) => {
  const { policy } = params;

  // Fetch specific Sanity policy with cache and tags
  const policyData = await client.fetch<SanityDocument>(
    POLICY_QUERY,
    { slug: policy },
    getPolicyOptions(policy),
  );

  if (!policyData) {
    return (
      <>
        <Navbar />
        <main className="flex min-h-screen items-center">
          <div className="mx-auto w-full max-w-5xl text-center">
            <h1
              className="font-display text-4xl font-bold 
              tracking-normal sm:text-5xl mb-8"
            >
              Política não encontrada
            </h1>
            <p className="text-lg text-gray-600">
              A política solicitada não foi encontrada.
            </p>
          </div>
        </main>
        <Footer />
        <WhatsApp />
      </>
    );
  }

  const lastUpdate = new Date(policyData._updatedAt || policyData._createdAt);
  const formateDateTime = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(lastUpdate);

  return (
    <>
      <Navbar />
      <main
        className="flex min-h-screen w-full flex-col 
        items-center px-4 md:px-8 lg:px-12 py-28 
        xs:py-40 relative"
      >
        <div className="mx-auto w-full max-w-5xl">
          <div className="text-center mb-16">
            <h1
              className="font-display text-4xl font-bold 
              tracking-normal sm:text-5xl"
            >
              {policyData.title} <br />
              Trajetto
            </h1>
          </div>

          <div
            className="mb-16 prose prose-lg 
            dark:prose-invert max-w-none"
          >
            {Array.isArray(policyData.content) && (
              <PortableText
                value={policyData.content}
                components={components}
              />
            )}
          </div>

          <div className="absolute bottom-16">
            <h1 className="font-semibold text-2xl">
              Seja bem vindo ao Trajetto
            </h1>
            <hr className="my-1" />
            <p className="text-lg">Última atualização: {formateDateTime}</p>
          </div>
        </div>
      </main>
      <Footer />
      <WhatsApp />
    </>
  );
};

export default LegalPolicy;
