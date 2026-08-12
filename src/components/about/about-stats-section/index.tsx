"use client";

import {
  ForwardRefExoticComponent,
  RefAttributes,
  useEffect,
  useRef,
  useState,
} from "react";

import { Reveal } from "@/components/shared/reveal";
import { useInView } from "@/hooks/use-in-view";
import { useCountUp } from "@/hooks/use-count-up";
import {
  LayoutGrid,
  LucideProps,
  ShieldCheck,
  Smartphone,
  WifiOff,
} from "lucide-react";

interface StatCardProps {
  stat: {
    value: number;
    suffix: string;
    label: string;
    icon: ForwardRefExoticComponent<
      Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>
    >;
    color1: string;
    color2: string;
    description: string;
  };
  isInView: boolean;
}

const AboutStatsSection = (): JSX.Element => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  // Números do PRODUTO, não da base de clientes. Cada um é verificável dentro
  // do próprio sistema — nada aqui depende de tração comercial que ainda não
  // existe.
  const stats = [
    {
      value: 20,
      suffix: "+",
      label: "Módulos de Gestão",
      icon: LayoutGrid,
      color1: "#0ea5e9", // Sky blue
      color2: "#2563eb", // Blue
      description: "Frota, ordens de serviço, custos, multas e muito mais",
    },
    {
      value: 2,
      suffix: "",
      label: "Plataformas",
      icon: Smartphone,
      color1: "#16a34a", // Green
      color2: "#059669", // Emerald
      description: "Painel web completo e app Android de campo",
    },
    {
      value: 100,
      suffix: "%",
      label: "Isolamento por Empresa",
      icon: ShieldCheck,
      color1: "#d81b60", // Pink
      color2: "#9d174d", // Rose
      description: "Cada empresa enxerga apenas os próprios dados",
    },
    {
      value: 24,
      suffix: "/7",
      label: "Registro em Campo",
      icon: WifiOff,
      color1: "#8b5cf6", // Purple
      color2: "#6d28d9", // Violet
      description: "O app funciona mesmo sem conexão no momento do registro",
    },
  ];

  return (
    <section
      ref={ref}
      className="py-20 relative overflow-hidden"
      style={{
        backgroundColor: "#f8fafc",
        backgroundImage: "radial-gradient(#d81b6015 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
    >
      <div
        className="absolute top-20 left-20 w-40 h-40 
        rounded-full bg-[#d81b60]/10 filter blur-3xl"
      />
      <div
        className="absolute bottom-20 right-20 w-60 
        h-60 rounded-full bg-[#0ea5e9]/10 filter blur-3xl"
      />

      <div className="container relative z-10 px-4 md:px-6">
        <div className="text-center mb-16">
          <Reveal duration={800}>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
              O que o Trajetto entrega
            </h2>
          </Reveal>
          <Reveal duration={800} delay={200}>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Uma plataforma completa de gestão de frotas, do escritório ao
              motorista em campo
            </p>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <Reveal key={index} delay={200 + index * 150} duration={700}>
              <StatCard stat={stat} isInView={isInView} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

const StatCard = ({ stat, isInView }: StatCardProps) => {
  const count = useCountUp(stat.value, { enabled: isInView });

  return (
    <div className="relative group">
      {/* Main card with gradient background */}
      <div
        className="h-full p-6 rounded-2xl overflow-hidden 
        transition-all duration-300 shadow-md hover:shadow-xl"
        style={{
          background: `linear-gradient(135deg, ${stat.color1}80, ${stat.color2}90)`,
        }}
      >
        {/* Glowing accent in top-right */}
        <div
          className="absolute top-0 right-0 w-20 h-20 rounded-full 
          opacity-30 transition-all duration-500 group-hover:opacity-50 
          group-hover:scale-125"
          style={{
            background: `radial-gradient(circle, ${stat.color1}, transparent 70%)`,
            filter: "blur(15px)",
          }}
        />

        {/* Card content with icon */}
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            {/* Icon with pulsing effect */}
            <div
              className="w-12 h-12 rounded-xl flex 
              items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${stat.color1}30, ${stat.color2}30)`,
              }}
            >
              <div className="animate-pulse-scale-sm">
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </div>

            {/* Small decorative element */}
            <div className="flex space-x-1">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-1 h-1 
                  rounded-full bg-white/50"
                />
              ))}
            </div>
          </div>

          {/* Number and label */}
          <div className="mb-3">
            <div
              className="text-4xl md:text-5xl font-bold 
            text-white tracking-tight"
            >
              {count}
              {stat.suffix}
            </div>
            <div
              className="text-lg font-medium 
            text-white/90 mt-1"
            >
              {stat.label}
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-white/70">{stat.description}</p>

          {/* Bottom accent bar that grows on hover */}
          <div
            className="h-1 w-12 mt-3 transition-all 
            duration-500 group-hover:w-full rounded-full"
            style={{
              background: `linear-gradient(to right, ${stat.color1}, ${stat.color2})`,
              boxShadow: `0 0 10px ${stat.color1}50`,
            }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export { AboutStatsSection };
