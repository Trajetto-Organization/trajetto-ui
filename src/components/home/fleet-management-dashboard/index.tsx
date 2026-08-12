"use client";

import Link from "next/link";

import Image from "next/image";

// Import estático: o Next gera o `blurDataURL` no build (ver app-show-case).
import managementDashboard from "@/../public/trajetto-management-dashboard.webp";

import { Reveal } from "@/components/shared/reveal";
import { useTilt } from "@/hooks/use-tilt";
import { buttonVariants } from "@/components/ui/button";

import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const FleetManagementDashboard = (): JSX.Element => {
  // Pointer tilt without a physics engine: the hook writes CSS custom
  // properties and the `.tilt` class swaps its transition depending on whether
  // the pointer is inside, which is what produces the springy return.
  const { ref: tiltRef, tiltProps } = useTilt<HTMLDivElement>({ max: 5 });

  return (
    <section className="py-16 sm:py-24 relative overflow-hidden">
      <div
        className="absolute inset-0 bg-gradient-to-b 
        from-background via-background/90 to-background z-0"
      />

      {/* Gradient mesh background - gives depth */}
      <div className="absolute inset-0 overflow-hidden opacity-30 z-0">
        <div
          className="absolute w-full h-full 
          bg-[radial-gradient(circle_at_50%_120%,#d81b60_0%,transparent_50%)]"
        />
        <div
          className="absolute w-full h-full 
          bg-[radial-gradient(circle_at_80%_20%,#2196f3_0%,transparent_50%)]"
        />
        <div
          className="absolute w-full h-full 
          bg-[radial-gradient(circle_at_20%_80%,#4caf50_0%,transparent_40%)]"
        />
      </div>

      <div className="container relative z-10">
        <Reveal
          duration={600}
          className="text-center space-y-2 sm:space-y-4 mb-16 max-w-3xl mx-auto"
        >
          <h2
            className="text-3xl font-bold tracking-tight inline-block 
            sm:text-5xl bg-clip-text text-transparent bg-gradient-to-r
            from-[#d81b60] via-foreground to-[#2196f3] pb-2 leading-relaxed"
          >
            Monitore a gestão da sua frota
          </h2>
          <p className="text-xl text-muted-foreground">
            Experimente o poder da visualização das suas frotas. Monitore seus
            veículos, e tome decisões baseadas em dados.
          </p>
        </Reveal>

        {/* Interactive 3D Box */}
        <div
          ref={tiltRef}
          {...tiltProps}
          className="tilt group/tilt relative mx-auto max-w-5xl
          h-[250px] sm:h-[300px]
          md:h-[400px] lg:h-[500px] rounded-2xl overflow-hidden border
          border-white/20 bg-background/80 backdrop-blur-sm
          shadow-[0_10px_30px_-5px_rgba(0,0,0,0.3)]
          hover:shadow-[0_20px_80px_-10px_rgba(216,27,96,0.3),0_30px_60px_-30px_rgba(33,150,243,0.4)]"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Dashboard image */}
          <div className="relative w-full h-full">
            <Image
              src={managementDashboard}
              alt="Dashboard de Gerenciamento de Frota"
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 90vw, 1200px"
              placeholder="blur"
              className="z-10 will-change-transform object-cover"
              style={{
                backfaceVisibility: "hidden",
                transform: "translateZ(0)",
              }}
              priority
            />

            {/* Glare effect. Position comes from the same CSS variables the
                tilt hook already writes, and the opacity is a plain hover on
                the tilted container — no second listener, no React state. */}
            <div
              className="absolute inset-0 z-20 bg-gradient-radial
              from-white/20 to-transparent opacity-0
              transition-opacity duration-300 group-hover/tilt:opacity-70"
              style={{
                backgroundSize: "600px 600px",
                backgroundPosition: "var(--glare-x, 50%) var(--glare-y, 50%)",
              }}
            />
          </div>
        </div>

        {/* Call to action */}
        <Reveal
          className="text-center mt-12 space-y-8"
          delay={400}
          duration={500}
        >
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Imagine reunir todas essas informações da sua frota em um só lugar,
            tomando decisões inteligentes, eficientes e economizando recursos
            valiosos.
          </p>
          <Link
            href={"/quote"}
            className={cn(
              buttonVariants({ size: "lg" }),
              `rounded-full bg-gradient-to-r from-[#d81b60] 
            to-[#d81b60]/80 hover:from-[#d81b60]/90 hover:to-[#d81b60]/70 
            text-white shadow-lg group`,
            )}
          >
            Solicitar Orçamento
            <div className="ml-2">
              <ArrowRight
                size={20}
                className="group-hover:translate-x-1 
                transition-all duration-300"
              />
            </div>
          </Link>
        </Reveal>
      </div>
    </section>
  );
};

export { FleetManagementDashboard };
