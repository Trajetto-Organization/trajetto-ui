import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

const Banner = (): JSX.Element => {
  return (
    <main
      className="mt-16 w-full p-24 bg-gradient-to-r to-[#a374e0] 
    from-[#f50057] flex-col items-center justify-center px-5"
    >
      <h2 className="text-center text-4xl font-medium text-white">
        Comece Sua Jornada Hoje
      </h2>

      <p className="mt-4 text-center text-gray-100 lg:text-lg">
        Reduza custos e ganhe eficiência. Solicite um orçamento!
      </p>

      <div
        className="mt-10 flex flex-col items-center 
        gap-6 md:flex-row justify-center w-full"
      >
        <Link
          href={"/login"}
          aria-label="Back to dashboard page"
          className={cn(
            buttonVariants({
              size: "lg",
              variant: "default",
              className: "text-white transition-colors group rounded-3xl",
            }),
          )}
        >
          Comece Agora
          <div className="ml-2">
            <ArrowRight
              size={20}
              className="group-hover:translate-x-1 
              transition-all duration-300"
            />
          </div>
        </Link>
      </div>
    </main>
  );
};

export { Banner };
