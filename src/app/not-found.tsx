import { Metadata } from "next";

import { ArrowLink } from "@/components/site/arrow-link";
import { Eyebrow, Lead, SectionHeading } from "@/components/site/primitives";
import { SiteShell } from "@/components/site/site-shell";

// Next adds its own noindex to a 404 response, but the layout's
// "index, follow" (and googleBot's) went out beside it; this page states
// one directive only.
export const metadata: Metadata = {
  title: "Página não encontrada",
  description:
    "A página que você procura não existe ou mudou de endereço. Volte para a página inicial para continuar navegando.",
  robots: { index: false, follow: true },
};

// Built from the site primitives so the 404 shares the header offset, type
// scale, buttons and backdrop of every other public page.
const NotFound = (): JSX.Element => (
  <SiteShell>
    <main className="relative flex min-h-[min(100svh,860px)] w-full flex-col items-center justify-center overflow-hidden px-[clamp(20px,4vw,40px)] pb-[clamp(56px,8vw,96px)] pt-[clamp(120px,14vw,160px)] text-center">
      {/* The soft glow the heroes use; decorative. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[18%] h-[420px] w-[min(900px,120vw)] -translate-x-1/2 bg-[radial-gradient(closest-side,rgb(var(--site-violet)/.10),rgb(var(--site-violet)/0))]"
      />
      <div className="relative mx-auto flex max-w-[760px] flex-col items-center">
        <Eyebrow className="mb-5 animate-tp-up">ERRO 404</Eyebrow>
        <SectionHeading
          as="h1"
          size="xl"
          className="animate-tp-up [animation-delay:80ms]"
        >
          Não foi possível encontrar a página.
        </SectionHeading>
        <Lead
          size="lg"
          className="mx-auto mt-5 max-w-[520px] animate-tp-up [animation-delay:160ms]"
        >
          A página que você procura não existe ou mudou de endereço.
        </Lead>
        <div className="mt-9 flex flex-wrap justify-center gap-3 animate-tp-up [animation-delay:240ms]">
          <ArrowLink href="/">Voltar para a página inicial</ArrowLink>
          <ArrowLink href="/blog" variant="secondary" arrow={false}>
            Ler o blog
          </ArrowLink>
        </div>
      </div>
    </main>
  </SiteShell>
);

export default NotFound;
