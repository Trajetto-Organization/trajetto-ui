"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { ArrowRight, MessageCircleMore, Zap, Lock } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { HeroDashboardShowcase } from "./hero-dashboard-showcase";

import { cn } from "@/lib/utils";

const AnimatedBadge = (): JSX.Element => {
  return (
    <div
      className="relative inline-flex 
      rounded-full p-[2px] overflow-hidden"
    >
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            "conic-gradient(from 0deg, #d81b60, #f06292, #880e4f, #e91e63, #d81b60)",
        }}
        animate={{ rotate: 360 }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      <div
        className="relative bg-background rounded-full
        px-4 py-1.5 flex items-center gap-2"
      >
        <span className="relative flex h-2 w-2">
          <span
            className="animate-ping absolute inline-flex h-full
            w-full rounded-full bg-[#d81b60] opacity-75"
          />
          <span
            className="relative inline-flex 
            rounded-full h-2 w-2 bg-[#d81b60]"
          />
        </span>

        <span className="text-sm font-medium text-muted-foreground">
          Dados que movem sua operação
        </span>
      </div>
    </div>
  );
};

const trustIndicators = [
  {
    icon: Zap,
    label: "Rápido",
    description: "Resultados em minutos.",
  },
  {
    icon: Lock,
    label: "Seguro",
    description: "Criptografia de ponta",
  },
];

const Hero = (): JSX.Element => {
  return (
    <div
      className="relative overflow-hidden py-32 md:py-36
      bg-gradient-to-br from-[#d81b60]/[0.03] 
      via-background to-[#880e4f]/[0.04]"
    >
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage:
            "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="container relative">
        <div
          className="grid items-center gap-8
          lg:gap-16 lg:grid-cols-[1fr_1.15fr]"
        >
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <AnimatedBadge />
            </motion.div>

            <h1
              className="text-5xl font-bold tracking-tighter
              lg:text-6xl bg-clip-text w-full
              bg-gradient-to-r from-foreground to-foreground/70"
            >
              Solução completa para gestão de frotas.
            </h1>

            <p className="text-xl text-muted-foreground">
              Clareza para gerenciar e confiança para decidir. <br /> Uma
              plataforma pensada para quem move o{" "}
              <motion.span
                className="inline-block font-semibold bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, #009739, #FEDD00, #009739, #FEDD00, #009739)",
                  backgroundSize: "200% 100%",
                }}
                animate={{ backgroundPosition: ["100% 50%", "0% 50%"] }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear",
                }}
              >
                Brasil
              </motion.span>
              .
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
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

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap items-start gap-6 pt-4"
            >
              {trustIndicators.map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div
                    className="flex items-center justify-center
                    w-10 h-10 rounded-full bg-[#d81b60]/10 flex-shrink-0"
                  >
                    <item.icon size={23} className="text-[#d81b60]" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-foreground">
                      {item.label}
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
          <HeroDashboardShowcase />
        </div>
      </div>
    </div>
  );
};

export { Hero };
