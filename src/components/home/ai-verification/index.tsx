"use client";

import { motion } from "framer-motion";
import {
  Camera,
  CheckCircle,
  ShieldCheck,
  Gauge,
  ClipboardCheck,
  Sparkles,
  BrainCircuit,
} from "lucide-react";

const scanLineVariants = {
  animate: {
    y: [0, 178, 0],
    transition: {
      duration: 2.5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

const verificationSteps = [
  { label: "Imagem capturada", number: "01" },
  { label: "Analisando odômetro", number: "02" },
  { label: "Quilometragem extraída", number: "03" },
  { label: "Verificação concluída", number: "04" },
];

const checklistSteps = [
  { label: "Foto do veículo recebida", number: "01" },
  { label: "Itens do checklist detectados", number: "02" },
  { label: "Condições verificadas por IA", number: "03" },
  { label: "Relatório gerado", number: "04" },
];

const AIVerificationShowcase = (): JSX.Element => {
  return (
    <section className="relative pt-24 pb-36 overflow-hidden">
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
            <BrainCircuit size={16} className="text-[#d81b60]" />
            <span className="text-sm font-medium text-muted-foreground">
              Inteligência Artificial
            </span>
          </div>

          <div className="text-center space-y-4">
            <h2
              className="text-4xl font-bold 
              tracking-tight lg:text-5xl"
            >
              IA que enxerga por você.
            </h2>

            <p
              className="text-lg text-muted-foreground
            max-w-2xl mx-auto"
            >
              Verificação automática de odômetro e checklist por visão
              computacional. Sem fraudes, sem erros manuais.
            </p>
          </div>
        </motion.div>

        <div
          className="grid gap-8 lg:gap-12
          lg:grid-cols-2 items-stretch"
        >
          {/* Odometer AI Card */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="group"
          >
            <div
              className="relative h-full rounded-2xl border
              bg-gradient-to-br from-background via-background to-[#d81b60]/[0.04]
              dark:to-[#d81b60]/[0.08]
              p-6 sm:p-8 shadow-lg hover:shadow-xl
              transition-shadow duration-300 overflow-hidden"
            >
              {/* Subtle corner glow */}
              <div
                className="absolute -top-24 -right-24 w-48 h-48
                bg-[#d81b60]/[0.06] rounded-full blur-3xl
                group-hover:bg-[#d81b60]/[0.1] transition-colors duration-500"
              />

              {/* Header */}
              <div className="relative flex items-center gap-3 mb-6">
                <div
                  className="w-10 h-10 rounded-xl bg-[#d81b60]/10
                  flex items-center justify-center"
                >
                  <Gauge size={20} className="text-[#d81b60]" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Leitura de Odômetro</h3>
                  <p className="text-xs text-muted-foreground">
                    Extração automática por foto
                  </p>
                </div>
              </div>

              {/* Content: stacks on mobile, side by side on sm+ */}
              <div className="relative flex flex-col sm:flex-row items-start gap-6">
                {/* Phone mockup */}
                <div className="relative flex-shrink-0 mx-auto sm:mx-0">
                  <div
                    className="relative w-[140px] h-[180px] rounded-2xl
                    bg-gradient-to-b from-slate-800 to-slate-900
                    border border-slate-700/50
                    flex items-center justify-center overflow-hidden
                    shadow-2xl shadow-slate-900/20"
                  >
                    <div className="text-center">
                      <Gauge
                        size={32}
                        className="text-[#d81b60] mx-auto mb-2"
                      />
                      <motion.div
                        className="font-mono text-2xl
                        font-bold text-white tracking-wider"
                        animate={{ opacity: [0.7, 1, 0.7] }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      >
                        087.432
                      </motion.div>
                      <p className="text-[10px] text-slate-400 mt-1">km</p>
                    </div>

                    {/* Scan line */}
                    <motion.div
                      className="absolute top-0 left-0 right-0 h-[2px]
                      bg-gradient-to-r from-transparent
                      via-[#d81b60] to-transparent opacity-80"
                      variants={scanLineVariants}
                      animate="animate"
                    />
                  </div>

                  {/* Camera badge */}
                  <div
                    className="absolute -bottom-2 -right-2
                    w-8 h-8 rounded-full bg-[#d81b60]
                    flex items-center justify-center shadow-lg
                    ring-4 ring-background"
                  >
                    <Camera size={14} className="text-white" />
                  </div>
                </div>

                {/* Verification timeline */}
                <div className="flex-1 w-full space-y-1">
                  {verificationSteps.map((step, index) => (
                    <motion.div
                      key={step.label}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5
                      hover:bg-[#d81b60]/[0.04] transition-colors"
                      initial={{ opacity: 0, x: 10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.15 }}
                    >
                      <motion.div
                        className="flex-shrink-0 w-7 h-7 rounded-full
                        bg-[#d81b60]/10 flex items-center justify-center"
                        animate={{
                          scale: [1, 1.1, 1],
                          opacity: [0.6, 1, 0.6],
                        }}
                        transition={{
                          duration: 2.5,
                          repeat: Infinity,
                          delay: index * 0.5,
                        }}
                      >
                        <CheckCircle size={14} className="text-[#d81b60]" />
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-foreground/80">
                          {step.label}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground/50">
                        {step.number}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Bottom accent */}
              <div className="mt-6 pt-4 border-t border-border/50">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Sparkles size={12} className="text-[#d81b60]" />
                  <span>Precisão de 99.7% na leitura</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Checklist AI Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="group"
          >
            <div
              className="relative h-full rounded-2xl border
              bg-gradient-to-br from-background via-background to-emerald-500/[0.04]
              dark:to-emerald-500/[0.08]
              p-6 sm:p-8 shadow-lg hover:shadow-xl
              transition-shadow duration-300 overflow-hidden"
            >
              {/* Subtle corner glow */}
              <div
                className="absolute -top-24 -right-24 w-48 h-48
                bg-emerald-500/[0.06] rounded-full blur-3xl
                group-hover:bg-emerald-500/[0.1] transition-colors duration-500"
              />

              {/* Header */}
              <div className="relative flex items-center gap-3 mb-6">
                <div
                  className="w-10 h-10 rounded-xl bg-emerald-500/10
                  flex items-center justify-center"
                >
                  <ClipboardCheck size={20} className="text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">
                    Checklist Inteligente
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Verificação visual automática
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="relative flex flex-col sm:flex-row items-start gap-6">
                {/* Phone mockup */}
                <div className="relative flex-shrink-0 mx-auto sm:mx-0">
                  <div
                    className="relative w-[140px] h-[180px] rounded-2xl
                    bg-gradient-to-b from-slate-800 to-slate-900
                    border border-slate-700/50
                    flex flex-col items-center
                    justify-center gap-2 px-3 overflow-hidden
                    shadow-2xl shadow-slate-900/20"
                  >
                    <ClipboardCheck
                      size={24}
                      className="text-emerald-400 mb-1"
                    />

                    {["Pneus", "Faróis", "Freios", "Nível óleo"].map(
                      (item, i) => (
                        <motion.div
                          key={item}
                          className="flex items-center gap-1.5 w-full"
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: i * 0.4,
                          }}
                        >
                          <div
                            className="w-3 h-3 rounded-sm bg-emerald-500/80
                            flex items-center justify-center"
                          >
                            <CheckCircle size={8} className="text-white" />
                          </div>
                          <span className="text-[10px] text-slate-300">
                            {item}
                          </span>
                        </motion.div>
                      ),
                    )}

                    {/* Scan line */}
                    <motion.div
                      className="absolute top-0 left-0 right-0 h-[2px]
                      bg-gradient-to-r from-transparent
                      via-emerald-400 to-transparent opacity-80"
                      variants={scanLineVariants}
                      animate="animate"
                    />
                  </div>

                  {/* Shield badge */}
                  <div
                    className="absolute -bottom-2 -right-2
                    w-8 h-8 rounded-full bg-emerald-500
                    flex items-center justify-center shadow-lg
                    ring-4 ring-background"
                  >
                    <ShieldCheck size={14} className="text-white" />
                  </div>
                </div>

                {/* Checklist timeline */}
                <div className="flex-1 w-full space-y-1">
                  {checklistSteps.map((step, index) => (
                    <motion.div
                      key={step.label}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5
                      hover:bg-emerald-500/[0.04] transition-colors"
                      initial={{ opacity: 0, x: 10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: (index + 1) * 0.15 }}
                    >
                      <motion.div
                        className="flex-shrink-0 w-7 h-7 rounded-full
                        bg-emerald-500/10 flex items-center justify-center"
                        animate={{
                          scale: [1, 1.1, 1],
                          opacity: [0.6, 1, 0.6],
                        }}
                        transition={{
                          duration: 2.5,
                          repeat: Infinity,
                          delay: index * 0.5,
                        }}
                      >
                        <CheckCircle size={14} className="text-emerald-500" />
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-foreground/80">
                          {step.label}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground/50">
                        {step.number}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Bottom accent */}
              <div className="mt-6 pt-4 border-t border-border/50">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Sparkles size={12} className="text-emerald-500" />
                  <span>Análise completa em segundos</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export { AIVerificationShowcase };
