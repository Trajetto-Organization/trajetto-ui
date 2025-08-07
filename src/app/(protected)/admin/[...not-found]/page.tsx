import { Metadata } from "next";
import Link from "next/link";

import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Página não encontrada",
    description: `
      Desculpe, a página que você está procurando não foi encontrada.
      Verifique a URL ou volte para a página inicial para continuar navegando
      em nosso site.
    `,
  };
}

const NotFound = async (): Promise<JSX.Element> => {
  return (
    <div
      className="flex w-full h-full
      flex-col items-center justify-center 
      px-4 sm:px-6 lg:px-8 text-center"
    >
      <h1
        className="font-display text-4xl font-bold 
        tracking-normal sm:text-5xl"
      >
        Não foi possível encontrar a página
      </h1>

      <p className="text-center mt-7">
        A página que você está procurando não existe ou foi movida | Página 404
      </p>

      <div className="mt-10">
        <Link
          aria-label="Back to dashboard page"
          href={"/dashboard"}
          className={cn(
            buttonVariants({ variant: "outline" }),
            `flex items-center justify-center h-10 
            px-4 w-full transition-colors group`,
          )}
        >
          Voltar para a página de administração
          <div className="ml-2">
            <ArrowRight
              size={20}
              className="group-hover:translate-x-1 
              transition-all duration-300"
            />
          </div>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
