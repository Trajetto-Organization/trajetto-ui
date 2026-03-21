"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import {
  Zap,
  Clock,
  TrendingUp,
  BarChart3,
  RefreshCw,
  Sparkles,
  MessageCircle,
  ArrowRight,
} from "lucide-react";

const bulletItems = [
  {
    icon: BarChart3,
    title: "Consultas restantes",
    description:
      "Acompanhe em tempo real quantas verificações de IA sua empresa ainda possui no período atual.",
    iconColor: "text-blue-600 dark:text-blue-400",
    bgColor:
      "bg-blue-100 dark:bg-blue-500/15 group-hover/item:bg-blue-200 dark:group-hover/item:bg-blue-500/25",
    borderAccent: "hover:border-blue-200 dark:hover:border-blue-500/30",
  },
  {
    icon: RefreshCw,
    title: "Reset automático",
    description:
      "Os limites são redefinidos automaticamente no início de cada ciclo. Sem ação manual necessária.",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    bgColor:
      "bg-emerald-100 dark:bg-emerald-500/15 group-hover/item:bg-emerald-200 dark:group-hover/item:bg-emerald-500/25",
    borderAccent: "hover:border-emerald-200 dark:hover:border-emerald-500/30",
  },
  {
    icon: TrendingUp,
    title: "Aumente seu limite",
    description:
      "Precisa de mais análises? Entre em contato conosco e expandimos o limite da sua empresa rapidamente.",
    iconColor: "text-violet-600 dark:text-violet-400",
    bgColor:
      "bg-violet-100 dark:bg-violet-500/15 group-hover/item:bg-violet-200 dark:group-hover/item:bg-violet-500/25",
    borderAccent: "hover:border-violet-200 dark:hover:border-violet-500/30",
  },
];

const AIUsageLimits = (): JSX.Element => {
  function getNextMonthReset() {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const formatted = new Intl.DateTimeFormat("pt-BR").format(nextMonth);
    return `Redefine em ${formatted} às 00:00`;
  }

  const displayLeft = 847;

  const displayTotal = 1000;
  const displayRemaining = displayTotal - displayLeft;

  const displayReset = getNextMonthReset();
  const percentage = Math.round((displayLeft / displayTotal) * 100);

  return (
    <section className="relative mt-10 mb-24 overflow-hidden">
      <div className="container relative">
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
            <Zap size={16} className="text-[#d81b60]" />
            <span className="text-sm font-medium text-muted-foreground">
              Limites de Uso
            </span>
          </div>

          <div className="text-center space-y-4">
            <h2
              className="text-4xl font-bold
              tracking-tight lg:text-5xl"
            >
              Controle total sobre seus limites.
            </h2>

            <p
              className="text-lg text-muted-foreground
              max-w-2xl mx-auto"
            >
              Visualize, gerencie e entenda seus limites de verificação por IA.
              Transparência completa sobre o uso da sua empresa.
            </p>
          </div>
        </motion.div>

        <div className="grid gap-8 lg:gap-12 lg:grid-cols-2 items-stretch">
          {/* Left side: Usage gauge */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="group h-full">
              <div
                className="relative rounded-2xl border
                bg-gradient-to-br from-background via-background to-[#d81b60]/[0.04]
                dark:to-[#d81b60]/[0.08]
                p-6 sm:p-8 shadow-lg hover:shadow-xl
                transition-shadow duration-300 overflow-hidden h-full
                flex flex-col"
              >
                {/* Corner glow */}
                <div
                  className="absolute -top-24 -right-24 w-48 h-48
                  bg-[#d81b60]/[0.06] rounded-full blur-3xl
                  group-hover:bg-[#d81b60]/[0.1] transition-colors duration-500"
                />

                {/* Header */}
                <div className="relative flex items-center gap-3 mb-8">
                  <div
                    className="w-10 h-10 rounded-xl bg-[#d81b60]/10
                    flex items-center justify-center"
                  >
                    <Zap size={20} className="text-[#d81b60]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Uso da IA</h3>
                    <p className="text-xs text-muted-foreground">
                      Acompanhamento em tempo real
                    </p>
                  </div>
                </div>

                {/* Usage display */}
                <div className="relative space-y-6 flex-1">
                  {/* Big numbers */}
                  <div className="text-center">
                    <motion.div
                      className="text-5xl font-bold tracking-tight"
                      initial={{ scale: 0.8, opacity: 0 }}
                      whileInView={{ scale: 1, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                    >
                      <span className="text-[#d81b60]">{displayLeft}</span>

                      <span className="text-muted-foreground/30 mx-1">/</span>
                      <span className="text-muted-foreground/50 text-3xl">
                        {displayTotal}
                      </span>
                    </motion.div>
                    <p className="text-sm text-muted-foreground mt-2">
                      verificações realizadas
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-2">
                    <div
                      className="h-3 rounded-full bg-muted/50 overflow-hidden"
                      role="progressbar"
                      aria-valuenow={displayLeft}
                      aria-valuemin={0}
                      aria-valuemax={displayTotal}
                      aria-label={`${displayLeft} de ${displayTotal} verificações restantes`}
                    >
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-[#d81b60] to-[#e91e63]"
                        initial={{ width: 0 }}
                        whileInView={{ width: `${percentage}%` }}
                        viewport={{ once: true }}
                        transition={{
                          duration: 1,
                          delay: 0.4,
                          ease: "easeOut",
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{percentage}% utilizados</span>
                      <span>{displayRemaining} restantes</span>
                    </div>
                  </div>

                  {/* Reset info */}
                  <div
                    className="flex items-center gap-2 rounded-lg
                    bg-muted/30 px-4 py-3"
                  >
                    <Clock size={14} className="text-[#d81b60] flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">
                      {displayReset}
                    </span>
                  </div>
                </div>

                {/* Bottom accent */}
                <div className="mt-6 pt-4 border-t border-border/50">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Sparkles size={12} className="text-[#d81b60]" />
                    <span>Visível no painel da sua empresa</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right side: Bullets */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col"
          >
            <ul className="flex flex-col gap-4 flex-1" role="list">
              {bulletItems.map((item, index) => (
                <motion.li
                  key={item.title}
                  className={`group/item flex items-start gap-4 rounded-xl
                  border bg-background p-5 sm:p-6 shadow-sm
                  hover:shadow-md transition-all duration-300
                  hover:-translate-y-0.5 flex-1 ${item.borderAccent}`}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15 }}
                >
                  <div
                    className={`flex-shrink-0 w-11 h-11 rounded-xl
                    ${item.bgColor} flex items-center justify-center
                    transition-colors duration-300`}
                  >
                    <item.icon size={20} className={item.iconColor} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm mb-1.5">
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
        </div>

        {/* CTA full-width */}
        <motion.div
          className="mt-10 rounded-2xl border bg-gradient-to-r
          from-[#d81b60]/5 via-violet-500/5 to-blue-500/5
          dark:from-[#d81b60]/10 dark:via-violet-500/10 dark:to-blue-500/10
          p-8 sm:p-10 text-center overflow-hidden relative"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          {/* Subtle glow */}
          <div
            className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64
            bg-[#d81b60]/[0.06] rounded-full blur-3xl pointer-events-none"
          />

          <div className="relative">
            <div
              className="w-12 h-12 rounded-xl bg-[#d81b60]/10
              flex items-center justify-center mx-auto mb-4"
            >
              <MessageCircle size={24} className="text-[#d81b60]" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold mb-2">
              Leve a inteligência artificial para sua frota
            </h3>
            <p
              className="text-muted-foreground max-w-lg mx-auto mb-6
              leading-relaxed"
            >
              Converse com nossa equipe e descubra o plano ideal para o tamanho
              da sua operação. Limites personalizados de acordo com a sua
              necessidade.
            </p>
            <Link
              href="/quote"
              className="inline-flex items-center gap-2 rounded-lg
              bg-[#d81b60] px-6 py-2.5 text-sm font-medium text-white
              shadow-lg shadow-[#d81b60]/20 group
              hover:bg-[#c2185b] transition-colors duration-200
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-[#d81b60] focus-visible:ring-offset-2"
              aria-label="Entrar em contato com a equipe"
            >
              Falar com nossa equipe
              <ArrowRight
                size={14}
                className="group-hover:translate-x-1 
                transition-all duration-300"
              />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export { AIUsageLimits };
