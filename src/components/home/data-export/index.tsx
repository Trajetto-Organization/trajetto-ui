"use client";

import { Step } from "@/components/step";
import { motion } from "framer-motion";

import {
  Download,
  FileSpreadsheet,
  FileText,
  Fuel,
  ClipboardCheck,
  AlertTriangle,
  Settings,
  Car,
  Users,
  CheckCircle2,
  Sparkles,
  ArrowDown,
} from "lucide-react";

// Mock data
const currentYear = new Date().getFullYear();
const tableRows = [
  {
    plate: "ABC-1234",
    driver: "Carlos Silva",
    km: "87.432",
    date: `15/03/${currentYear} às 14:22`,
  },
  {
    plate: "DEF-5678",
    driver: "Ana Costa",
    km: "124.890",
    date: `14/03/${currentYear} às 09:15`,
  },
  {
    plate: "GHI-9012",
    driver: "João Lima",
    km: "56.201",
    date: `13/03/${currentYear} às 16:48`,
  },
  {
    plate: "JKL-3456",
    driver: "Maria Souza",
    km: "201.456",
    date: `12/03/${currentYear} às 08:30`,
  },
];

const csvLines = [
  "placa,motorista,km,data",
  `ABC-1234,Carlos Silva,87432,15/03/${currentYear} às 14:22`,
  `DEF-5678,Ana Costa,124890,14/03/${currentYear} às 09:15`,
  `GHI-9012,João Lima,56201,13/03/${currentYear} às 16:48`,
  `JKL-3456,Maria Souza,201456,12/03/${currentYear} às 08:30`,
];

const excelRows = [
  ["Placa", "Motorista", "Km", "Data"],
  ["ABC-1234", "Carlos Silva", "87.432", `15/03/${currentYear} às 14:22`],
  ["DEF-5678", "Ana Costa", "124.890", `14/03/${currentYear} às 09:15`],
  ["GHI-9012", "João Lima", "56.201", `13/03/${currentYear} às 16:48`],
];

const exportableEntities = [
  {
    icon: Fuel,
    label: "Abastecimentos",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: ClipboardCheck,
    label: "Checklists",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: AlertTriangle,
    label: "Multas",
    color: "text-red-500",
    bg: "bg-red-500/10",
  },
  {
    icon: Settings,
    label: "Ordens de Serviço",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: Car,
    label: "Veículos",
    color: "text-[#d81b60]",
    bg: "bg-[#d81b60]/10",
  },
  {
    icon: Users,
    label: "Motoristas",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
];

const DataExportShowcase = (): JSX.Element => {
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
        via-emerald-500/[0.02] to-background pointer-events-none"
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
              <Download size={16} className="text-[#d81b60]" />
              <span className="text-sm font-medium text-muted-foreground">
                Exportação de Dados
              </span>
            </div>

            <h2 className="text-4xl font-bold tracking-tight lg:text-5xl">
              Seus dados, no seu formato.
            </h2>

            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Exporte qualquer relatório em{" "}
              <span className="font-semibold text-emerald-500">CSV</span> ou{" "}
              <span className="font-semibold text-indigo-500">Excel</span> com
              um clique. Sem configuração, sem complicação.
            </p>
          </motion.div>

          {/* Two-column layout */}
          <div className="grid gap-12 lg:gap-16 lg:grid-cols-2 items-center">
            {/* Left: exportable modules*/}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h3 className="text-2xl font-semibold mb-2">Tudo exportável.</h3>
              <p className="text-muted-foreground mb-8 text-base leading-relaxed">
                Cada módulo da plataforma permite exportar seus dados completos,
                respeitando os filtros ativos na tabela naquele momento.
              </p>

              <div className="grid grid-cols-2 gap-3 mb-8">
                {exportableEntities.map((entity, index) => (
                  <motion.div
                    key={entity.label}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.08, duration: 0.4 }}
                    className="flex items-center gap-3 rounded-xl border bg-card
                    p-3 hover:shadow-md transition-all duration-200
                    hover:-translate-y-0.5 cursor-default"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg ${entity.bg}
                    flex items-center justify-center flex-shrink-0`}
                    >
                      <entity.icon size={16} className={entity.color} />
                    </div>
                    <span className="text-sm font-medium">{entity.label}</span>
                  </motion.div>
                ))}
              </div>

              {/* Format badges */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="flex items-center gap-2 rounded-full border
                bg-emerald-500/[0.06] border-emerald-500/20 px-4 py-2"
                >
                  <FileText size={14} className="text-emerald-500" />
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    .CSV
                  </span>
                </div>
                <div
                  className="flex items-center gap-2 rounded-full border
                bg-indigo-500/[0.06] border-indigo-500/20 px-4 py-2"
                >
                  <FileSpreadsheet size={14} className="text-indigo-500" />
                  <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                    .XLSX
                  </span>
                </div>
              </div>

              <div
                className="flex items-start gap-2 
                text-sm text-muted-foreground"
              >
                <CheckCircle2
                  size={14}
                  className="text-emerald-500 mt-0.5 flex-shrink-0"
                />
                <span>
                  Exporta exatamente os dados filtrados visíveis na tabela —
                  nada a mais, nada a menos.
                </span>
              </div>
            </motion.div>

            {/* Right: visual flow demo */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative flex flex-col items-center gap-4"
            >
              {/* Table card */}
              <div
                className="w-full rounded-2xl border 
                bg-card shadow-xl overflow-hidden"
              >
                {/* Window chrome */}
                <div
                  className="flex items-center justify-between
                  border-b px-4 py-3 bg-muted/30"
                >
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />

                    <div className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
                    <span className="ml-2 text-xs text-muted-foreground font-mono">
                      abastecimentos — 4 registros
                    </span>
                  </div>

                  {/* Export button */}
                  <motion.div
                    className="flex items-center gap-1.5 text-xs font-medium
                    px-3 py-1.5 rounded-md border bg-background
                    shadow-sm select-none"
                    animate={{ scale: [1, 1.04, 1] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                      repeatDelay: 1.5,
                    }}
                  >
                    <Download size={11} />
                    Exportar
                  </motion.div>
                </div>

                {/* Table header row */}
                <div className="grid grid-cols-4 bg-muted/20 border-b">
                  {["Placa", "Motorista", "Km", "Data"].map((h) => (
                    <div
                      key={h}
                      className="px-3 py-2 text-[11px] font-semibold
                      text-muted-foreground uppercase tracking-wide"
                    >
                      {h}
                    </div>
                  ))}
                </div>

                {/* Data rows */}
                {tableRows.map((row, index) => (
                  <motion.div
                    key={row.plate}
                    className="grid grid-cols-4 border-b border-border/40
                    last:border-0 hover:bg-muted/20 transition-colors"
                    initial={{ opacity: 0, x: -8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.35 + index * 0.08 }}
                  >
                    <div className="px-3 py-2.5 text-xs font-mono font-semibold">
                      {row.plate}
                    </div>
                    <div className="px-3 py-2.5 text-xs text-muted-foreground">
                      {row.driver}
                    </div>
                    <div className="px-3 py-2.5 text-xs font-medium">
                      {row.km}
                    </div>
                    <div className="px-3 py-2.5 text-xs text-muted-foreground">
                      {row.date}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Arrow connector */}
              <motion.div
                className="flex flex-col items-center 
                gap-1 text-muted-foreground/50"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.8 }}
              >
                <motion.div
                  animate={{ y: [0, 4, 0] }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <ArrowDown size={18} className="text-muted-foreground/40" />
                </motion.div>
                <span
                  className="text-[10px] font-medium 
                  tracking-wide uppercase"
                >
                  escolha o formato
                </span>
              </motion.div>

              {/* Format output cards */}
              <div className="grid grid-cols-2 gap-3 w-full">
                {/* CSV card */}
                <motion.div
                  className="group relative rounded-2xl border
                bg-slate-900 dark:bg-slate-950
                  p-4 overflow-hidden shadow-lg hover:shadow-xl
                  transition-shadow duration-300"
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.7 }}
                  whileHover={{ y: -2 }}
                >
                  {/* Glow */}
                  <div
                    className="absolute -bottom-6 -right-6 w-20 h-20
                  bg-emerald-500/25 rounded-full blur-2xl group-hover:bg-emerald-500/40 
                    transition-colors duration-500"
                  />

                  <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="w-7 h-7 rounded-lg bg-emerald-500/20
                        flex items-center justify-center"
                      >
                        <FileText size={14} className="text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-emerald-400">
                          CSV
                        </p>
                        <p className="text-[9px] text-slate-500 font-mono">
                          relatório.csv
                        </p>
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      {csvLines.map((line, i) => (
                        <motion.div
                          key={i}
                          className={`text-[9px] font-mono truncate leading-relaxed ${
                            i === 0
                              ? "text-emerald-400 font-bold"
                              : "text-slate-400"
                          }`}
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.9 + i * 0.1 }}
                        >
                          {line}
                        </motion.div>
                      ))}
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-700/50">
                      <p className="text-[10px] text-slate-500">
                        Compatível com qualquer editor de planilhas
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Excel card */}
                <motion.div
                  className="group relative rounded-2xl border bg-card
                  p-4 overflow-hidden shadow-lg hover:shadow-xl
                  transition-shadow duration-300
                  bg-gradient-to-br from-background via-background
                to-indigo-500/[0.04] dark:to-indigo-500/[0.08]"
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.8 }}
                  whileHover={{ y: -2 }}
                >
                  {/* Glow */}
                  <div
                    className="absolute -bottom-6 -right-6 w-20 h-20
                  bg-indigo-500/15 rounded-full blur-2xl
                  group-hover:bg-indigo-500/25 transition-colors duration-500"
                  />

                  <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="w-7 h-7 rounded-lg bg-indigo-500/10
                        flex items-center justify-center"
                      >
                        <FileSpreadsheet
                          size={14}
                          className="text-indigo-500"
                        />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-indigo-500">
                          Excel
                        </p>
                        <p className="text-[9px] text-muted-foreground font-mono">
                          relatório.xlsx
                        </p>
                      </div>
                    </div>

                    {/* Mini spreadsheet grid */}
                    <div className="rounded-md border border-border/60 overflow-hidden">
                      {excelRows.map((row, i) => (
                        <motion.div
                          key={i}
                          className={`flex border-b border-border/40 last:border-0
                          ${i === 0 ? "bg-indigo-500/10" : i % 2 === 0 ? "bg-muted/20" : ""}`}
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: 1.0 + i * 0.1 }}
                        >
                          {row.slice(0, 4).map((cell, j) => (
                            <div
                              key={j}
                              className={`text-[8px] px-1.5 py-1 border-r border-border/30
                              last:border-r-0 flex-1 truncate min-w-0
                              ${
                                i === 0
                                  ? "font-bold text-indigo-600 dark:text-indigo-400"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {cell}
                            </div>
                          ))}
                        </motion.div>
                      ))}
                    </div>

                    <div className="mt-3 pt-3 border-t border-border/50">
                      <p className="text-[10px] text-muted-foreground">
                        Planilha formatada para análises avançadas
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Bottom note */}
              <motion.div
                className="flex items-center gap-2 text-xs text-muted-foreground"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 1.2 }}
              >
                <Sparkles size={12} className="text-[#d81b60]" />
                <span>
                  Um clique no botão Exportar — você escolhe o formato na hora
                </span>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
};

export { DataExportShowcase };
