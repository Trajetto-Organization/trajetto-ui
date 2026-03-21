"use client";

import { motion } from "framer-motion";
import { Step } from "@/components/step";

import {
  GraduationCap,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  MapPin,
  Repeat2,
  LayoutDashboard,
  Fuel,
  ClipboardCheck,
  Users,
  Car,
  MousePointerClick,
} from "lucide-react";

const benefits = [
  {
    icon: MousePointerClick,
    title: "Aparece automaticamente",
    description:
      "Na primeira visita a cada página, o guia inicia sozinho — sem nenhuma ação do usuário.",
    iconColor: "text-[#d81b60]",
    bgColor: "bg-[#d81b60]/10 group-hover/item:bg-[#d81b60]/20",
    borderAccent: "hover:border-[#d81b60]/20",
  },
  {
    icon: MapPin,
    title: "Destaque visual",
    description:
      "Cada passo realça exatamente o elemento explicado com um anel pulsante — sem deixar dúvidas.",
    iconColor: "text-violet-500",
    bgColor: "bg-violet-500/10 group-hover/item:bg-violet-500/20",
    borderAccent: "hover:border-violet-500/20",
  },
  {
    icon: Repeat2,
    title: "Retome quando quiser",
    description:
      'Acesse "Ver Tutorial" no menu lateral e reinicie o guia da página atual a qualquer momento.',
    iconColor: "text-emerald-500",
    bgColor: "bg-emerald-500/10 group-hover/item:bg-emerald-500/20",
    borderAccent: "hover:border-emerald-500/20",
  },
];

const sidebarIcons = [Fuel, Car, Users, ClipboardCheck];

const TutorialShowcase = (): JSX.Element => {
  return (
    <>
      <div
        className="w-full flex flex-row 
        justify-center h-24 mt-5"
      >
        <Step />
      </div>

      <section className="relative py-24 overflow-hidden">
        {/* Subtle tinted background */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-background
          via-violet-500/[0.02] to-background pointer-events-none"
        />

        <div className="container relative">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <div
              className="inline-flex items-center gap-2
              rounded-full border px-4 py-1.5 mb-6"
            >
              <GraduationCap size={16} className="text-[#d81b60]" />
              <span className="text-sm font-medium text-muted-foreground">
                Tutorial Interativo
              </span>
            </div>

            <h2 className="text-4xl font-bold tracking-tight lg:text-5xl">
              Aprenda sem depender de ninguém.
            </h2>

            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Um guia passo a passo embutido em cada página da plataforma. Na
              primeira visita, o tutorial inicia{" "}
              <span className="font-semibold text-[#d81b60]">
                automaticamente
              </span>{" "}
              e explica exatamente o que cada elemento faz.
            </p>
          </motion.div>

          {/* Two-column layout */}
          <div className="grid gap-12 lg:gap-16 lg:grid-cols-2 items-center">
            {/* Left: benefits + pages */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h3 className="text-2xl font-semibold mb-2">
                Zero curva de aprendizado.
              </h3>
              <p className="text-muted-foreground mb-8 text-base leading-relaxed">
                Não importa se o usuário é novo ou experiente — o tutorial
                garante que ninguém fique perdido dentro da plataforma.
              </p>

              {/* Benefit cards */}
              <ul className="flex flex-col gap-3 mb-8" role="list">
                {benefits.map((item, index) => (
                  <motion.li
                    key={item.title}
                    className={`group/item flex items-start gap-4 rounded-xl
                    border bg-card p-4 shadow-sm hover:shadow-md
                    transition-all duration-300 hover:-translate-y-0.5
                    ${item.borderAccent}`}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-xl
                      ${item.bgColor} flex items-center justify-center
                      transition-colors duration-300`}
                    >
                      <item.icon size={18} className={item.iconColor} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-1">
                        {item.title}
                      </h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            {/* Right: visual tutorial mockup */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              {/* Browser mockup card */}
              <div
                className="w-full rounded-2xl border 
                bg-card shadow-2xl overflow-hidden"
              >
                {/* Window chrome */}
                <div
                  className="flex items-center gap-2 px-4 py-3
                  border-b bg-muted/30"
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400/80" />

                  <div
                    className="flex-1 mx-3 h-5 rounded-md
                    flex items-center px-3 bg-muted/50"
                  >
                    <span className="text-[10px] text-muted-foreground font-mono">
                      https://www.intrajetto.com
                    </span>
                  </div>
                </div>

                {/* App content */}
                <div className="flex">
                  {/* Mini sidebar */}
                  <div
                    className="w-12 border-r bg-muted/20 py-3
                    flex flex-col items-center gap-3"
                  >
                    <div
                      className="w-7 h-7 rounded-lg bg-[#d81b60]/15
                      flex items-center justify-center"
                    >
                      <LayoutDashboard size={13} className="text-[#d81b60]" />
                    </div>

                    {sidebarIcons.map((Icon, i) => (
                      <div
                        key={i}
                        className="w-7 h-7 rounded-lg bg-muted/40
                        flex items-center justify-center"
                      >
                        <Icon size={12} className="text-muted-foreground/40" />
                      </div>
                    ))}
                  </div>

                  {/* Main content area */}
                  <div className="flex-1 p-4">
                    {/* Page title skeleton */}
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="h-3.5 w-20 rounded bg-foreground/80" />
                        <div className="h-2 w-32 rounded bg-muted-foreground/30 mt-1.5" />
                      </div>
                      <div className="h-6 w-16 rounded-md bg-muted/60" />
                    </div>

                    {/* Stat cards row */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {/* Plain card */}
                      <div className="rounded-lg border bg-card p-2.5">
                        <div className="h-2 w-10 rounded bg-muted-foreground/30 mb-2" />
                        <div className="h-4 w-8 rounded bg-foreground/60 mb-1" />
                        <div className="h-1.5 w-12 rounded bg-muted-foreground/20" />
                      </div>

                      {/* Highlighted / focused card */}
                      <div className="relative">
                        {/* Inner border ring — opacity loop */}
                        <motion.div
                          className="absolute inset-0 rounded-lg border-2
                          border-[#d81b60] pointer-events-none"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        />

                        <div
                          className="rounded-lg border border-[#d81b60]/30
                          bg-[#d81b60]/5 p-2.5"
                        >
                          <div className="h-2 w-10 rounded bg-muted-foreground/30 mb-2" />
                          <div className="h-4 w-8 rounded bg-[#d81b60]/60 mb-1" />
                          <div className="h-1.5 w-12 rounded bg-[#d81b60]/20" />
                        </div>

                        {/* Step badge */}
                        <div
                          className="absolute -top-1.5 -right-1.5 w-4 h-4
                          rounded-full bg-[#d81b60] flex items-center
                          justify-center shadow-md shadow-[#d81b60]/30"
                        >
                          <span className="text-[8px] text-white font-bold">
                            2
                          </span>
                        </div>
                      </div>

                      {/* Plain card */}
                      <div className="rounded-lg border bg-card p-2.5">
                        <div className="h-2 w-10 rounded bg-muted-foreground/30 mb-2" />
                        <div className="h-4 w-8 rounded bg-foreground/60 mb-1" />
                        <div className="h-1.5 w-12 rounded bg-muted-foreground/20" />
                      </div>
                    </div>

                    {/* Table skeleton */}
                    <div className="rounded-lg border bg-card p-3">
                      <div className="h-2.5 w-28 rounded bg-foreground/70 mb-3" />
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="flex gap-3 py-1.5 border-b
                          border-border/30 last:border-0"
                        >
                          <div className="h-2 w-14 rounded bg-muted-foreground/20" />
                          <div className="h-2 w-20 rounded bg-muted-foreground/15" />
                          <div className="h-2 w-10 rounded bg-muted-foreground/10" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Tutorial tooltip (inside mockup bottom) */}
                <motion.div
                  className="mx-4 mb-4 rounded-xl border bg-background
                  shadow-xl overflow-hidden"
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.75, duration: 0.4, ease: "easeOut" }}
                >
                  {/* Gradient accent bar */}
                  <div
                    className="h-0.5 bg-gradient-to-r from-[#d81b60]
                    via-violet-500 to-[#d81b60]"
                  />

                  <div className="p-4">
                    {/* Step label + close */}
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-[10px] font-semibold
                        text-[#d81b60] uppercase tracking-wide"
                      >
                        Passo 2 de 4
                      </span>
                      <div
                        className="w-5 h-5 rounded-md bg-muted/50
                        flex items-center justify-center"
                      >
                        <span className="text-[9px] text-muted-foreground">
                          ✕
                        </span>
                      </div>
                    </div>

                    {/* Title + description */}
                    <p className="text-sm font-semibold mb-1">
                      Cartões de Estatísticas
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                      Cada cartão mostra um contador em tempo real. Clique para
                      navegar diretamente para a seção correspondente.
                    </p>

                    {/* Progress dots + nav buttons */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {[0, 1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className={`h-1.5 rounded-full transition-all ${
                              i === 1
                                ? "w-4 bg-[#d81b60]"
                                : "w-1.5 bg-muted-foreground/25"
                            }`}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10px] text-muted-foreground
                          px-2 py-1 rounded-md cursor-pointer
                          hover:bg-muted/50 transition-colors"
                        >
                          Pular
                        </span>
                        <div className="flex items-center gap-1">
                          <span
                            className="flex items-center gap-0.5 text-[10px]
                            text-muted-foreground border rounded-md
                            px-2 py-1 cursor-pointer hover:bg-muted/50
                            transition-colors"
                          >
                            <ChevronLeft size={9} />
                            Ant.
                          </span>
                          <span
                            className="flex items-center gap-0.5 text-[10px]
                            text-white bg-[#d81b60] rounded-md px-2 py-1
                            cursor-pointer hover:bg-[#c2185b] transition-colors"
                          >
                            Próx.
                            <ChevronRight size={9} />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Bottom note */}
              <motion.div
                className="flex items-center justify-center gap-2
                text-xs text-muted-foreground mt-4"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 1.1 }}
              >
                <Sparkles size={12} className="text-[#d81b60]" />
                <span>Pule ou reinicie quando quiser</span>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
};

export { TutorialShowcase };
