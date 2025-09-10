import Link from "next/link";

import { ArrowRight, MessageCircleMore } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

import { HeroVideoSection } from "./hero-video-section";
import { cn } from "@/lib/utils";

const Hero = (): JSX.Element => {
  return (
    <div
      className="relative overflow-hidden 
      pt-32 pb-20 bg-background"
    >
      <div className="container relative">
        <div
          className="grid gap-8 lg:grid-cols-2 
          lg:gap-12 items-center"
        >
          <div className="space-y-6">
            <h1
              className="text-5xl font-bold tracking-tight 
              lg:text-6xl bg-clip-text text-transparent 
              bg-gradient-to-r from-foreground to-foreground/70 
              leading-[1.10] pb-1"
            >
              Gestão de Frotas Inteligentes e Conectadas
            </h1>
            <p className="text-xl text-muted-foreground">
              Plataforma inteligente de gestão de frotas, gerencie e otimize sua
              frota com máxima precisão e eficiência.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-1">
              <Link
                href={"/login"}
                aria-label="Back to dashboard page"
                className={cn(
                  buttonVariants({
                    size: "lg",
                    variant: "outline",
                    className:
                      "bg-[#d81b60] text-white transition-colors group rounded-3xl",
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
              <Link
                href={"/quote"}
                className={cn(
                  buttonVariants({
                    size: "lg",
                    variant: "outline",
                    className: "rounded-3xl",
                  }),
                )}
              >
                <MessageCircleMore size={17} />
                Vamos Conversar?
              </Link>
            </div>
          </div>

          <HeroVideoSection />
        </div>
      </div>
    </div>
  );
};

export { Hero };
