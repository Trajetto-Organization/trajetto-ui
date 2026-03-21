"use client";

import { motion } from "framer-motion";
import {
  GripVertical,
  Plus,
  Sparkles,
  CircuitBoardIcon,
  Search,
  Tag,
  CalendarIcon,
  CheckCircle2,
  AlertCircle,
  MoreHorizontal,
  Kanban,
} from "lucide-react";

import { Step } from "@/components/step";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

import type { ShowcaseCard } from "./kanban-showcase.types";
import { benefits, columns, priorityConfig } from "./data";

const ShowcaseCardComponent = ({
  card,
  colIndex,
  cardIndex,
}: {
  card: ShowcaseCard;
  colIndex: number;
  cardIndex: number;
}) => {
  const priority = priorityConfig[card.priority];
  const isCompleted = card.completed || false;

  return (
    <motion.div
      className={`group/card relative rounded-md border bg-background p-3
      shadow-sm hover:shadow-md transition-all duration-300
      hover:-translate-y-0.5 cursor-grab active:cursor-grabbing
      ${isCompleted ? "opacity-70 bg-muted/40 border-dashed border-green-200" : ""}`}
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{
        delay: colIndex * 0.15 + cardIndex * 0.1,
      }}
      role="listitem"
    >
      {/* Card Header */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h4
          className={`text-sm font-medium line-clamp-2 ${
            isCompleted
              ? "text-muted-foreground line-through decoration-green-500 decoration-2"
              : ""
          }`}
        >
          {card.title}
        </h4>
        {isCompleted ? (
          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
        ) : card.overdue ? (
          <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
        ) : null}
      </div>

      {/* Description */}
      {card.description && (
        <p
          className={`text-xs text-muted-foreground mb-2.5 line-clamp-2 ${
            isCompleted
              ? "line-through decoration-green-500/70 decoration-1"
              : ""
          }`}
        >
          {card.description}
        </p>
      )}

      {/* Card Footer - Priority, Due Date, User */}
      <div className="flex flex-wrap items-center gap-1.5 mt-2">
        {/* Priority Badge */}
        <span
          className={`inline-flex items-center gap-1 rounded-full
            border px-1.5 py-0.5 text-[10px] font-medium
            ${priority.badgeColor}
            ${isCompleted ? "opacity-60" : ""}`}
        >
          <Tag size={8} />
          {priority.label}
        </span>

        {/* Due Date */}
        <span
          className={`inline-flex items-center gap-1 rounded-full
            border px-1.5 py-0.5 text-[10px] font-medium
            ${
              isCompleted
                ? "bg-green-50 text-green-600 border-green-200 dark:bg-green-500/15 dark:text-green-400 dark:border-green-500/30 opacity-70"
                : "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-500/15 dark:text-gray-400 dark:border-gray-500/30"
            }`}
        >
          {isCompleted ? <CheckCircle2 size={8} /> : <CalendarIcon size={8} />}
          {card.dueDate}
        </span>

        {/* Assigned User */}
        <div
          className={`ml-auto w-6 h-6 rounded-full ${card.userColor}
            flex items-center justify-center
            ${isCompleted ? "opacity-70" : ""}`}
          title={`Atribuído a ${card.user}`}
        >
          <span className="text-[9px] font-bold text-white">{card.user}</span>
        </div>
      </div>

      {/* Completed overlay */}
      {isCompleted && (
        <div
          className="absolute inset-0 bg-green-500/5 
          rounded-md pointer-events-none"
        />
      )}
    </motion.div>
  );
};

const KanbanShowcase = (): JSX.Element => {
  return (
    <>
      <div
        className="w-full flex flex-row
        justify-center h-24 mt-14"
      >
        <Step />
      </div>
      <section className="relative py-24 overflow-hidden">
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
              <CircuitBoardIcon size={16} className="text-[#d81b60]" />
              <span className="text-sm font-medium text-muted-foreground">
                Gestão Visual
              </span>
            </div>

            <div className="text-center space-y-4">
              <h2
                className="text-4xl font-bold
                tracking-tight lg:text-5xl"
              >
                Organize tudo, visualmente.
              </h2>

              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Kanban integrado para gerenciar tarefas, manutenções e processos
                da frota. Arraste, organize e acompanhe todo o progresso da sua
                operação.
              </p>
            </div>
          </motion.div>

          {/* Kanban preview */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="mb-16"
          >
            <div
              className="rounded-2xl border shadow-lg
              bg-background overflow-hidden"
            >
              {/* Kanban toolbar */}
              <div
                className="flex flex-col sm:flex-row items-stretch 
                sm:items-center gap-3 px-6 py-3 border-b bg-muted/20"
              >
                {/* Title */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <div
                    className="w-8 h-8 rounded-lg bg-[#d81b60]/10
                    flex items-center justify-center"
                  >
                    <Kanban size={16} className="text-[#d81b60]" />
                  </div>
                  <h3 className="font-semibold text-sm">Kanban</h3>
                </div>

                {/* Search input */}
                <div className="relative ml-0 sm:ml-5 flex-1 min-w-0 sm:max-w-md">
                  <Search
                    className="absolute left-3 top-1/2 transform
                    -translate-y-1/2 text-muted-foreground h-4 w-4"
                  />
                  <div
                    className="w-full h-9 rounded-md border bg-background
                    pl-10 pr-4 flex items-center"
                  >
                    <span className="text-sm text-muted-foreground truncate">
                      Buscar por ID, coluna, card ou usuário...
                    </span>
                  </div>
                </div>

                {/* Add Column button */}
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-md
                  border border-dashed px-4 h-9 text-sm text-muted-foreground
                  hover:bg-muted/50 transition-colors focus-visible:outline-none 
                  focus-visible:ring-2 focus-visible:ring-[#d81b60] 
                  focus-visible:ring-offset-2 sm:ml-auto"
                  aria-label="Adicionar coluna"
                  type="button"
                >
                  <Plus size={14} />
                  Adicionar Coluna
                </button>
              </div>

              {/* Kanban columns with ScrollArea */}
              <ScrollArea className="w-full">
                <div className="p-4">
                  <div
                    className="flex gap-4 items-start"
                    role="list"
                    aria-label="Colunas do Kanban"
                  >
                    {columns.map((column, colIndex) => (
                      <motion.div
                        key={column.title}
                        className="min-w-[280px] max-w-[280px] bg-muted/30 rounded-lg"
                        style={{
                          borderTop: `3px solid ${column.color}`,
                        }}
                        initial={{ opacity: 0, y: 15 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: colIndex * 0.15 }}
                      >
                        <div className="p-4">
                          {/* Column header */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <GripVertical
                                size={14}
                                className="text-muted-foreground cursor-grab flex-shrink-0"
                              />
                              <h4 className="text-sm font-semibold truncate">
                                {column.title}
                              </h4>
                              <span
                                className="text-xs text-muted-foreground
                                bg-muted px-2 py-0.5 rounded-full flex-shrink-0"
                              >
                                {column.cards.length}
                              </span>
                            </div>
                            <button
                              className="text-muted-foreground/60 hover:text-muted-foreground
                              transition-colors h-8 w-8 flex items-center justify-center
                              rounded-md hover:bg-muted/50"
                              aria-label={`Opções da coluna ${column.title}`}
                              type="button"
                            >
                              <MoreHorizontal size={14} />
                            </button>
                          </div>

                          {/* Cards */}
                          <div
                            className="space-y-3"
                            role="list"
                            aria-label={`Cards: ${column.title}`}
                          >
                            {column.cards.map((card, cardIndex) => (
                              <ShowcaseCardComponent
                                key={card.title}
                                card={card}
                                colIndex={colIndex}
                                cardIndex={cardIndex}
                              />
                            ))}
                          </div>

                          {/* Add Card button */}
                          <button
                            className="w-full flex items-center justify-start gap-2
                            mt-3 px-2 py-2 rounded-md text-sm
                            text-muted-foreground hover:text-foreground
                            hover:bg-muted/50 transition-colors"
                            type="button"
                            aria-label={`Adicionar card em ${column.title}`}
                          >
                            <Plus size={14} />
                            Adicionar Card
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          </motion.div>

          {/* Benefits */}
          <div className="grid gap-6 sm:grid-cols-3 mb-12">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                className="group flex flex-col items-center text-center
                rounded-xl border bg-background p-6 shadow-sm
                hover:shadow-md transition-all duration-300
                hover:-translate-y-0.5"
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
              >
                <div
                  className="w-12 h-12 rounded-xl bg-[#d81b60]/10
                flex items-center justify-center mb-4
                group-hover:bg-[#d81b60]/15 transition-colors"
                >
                  <benefit.icon size={22} className="text-[#d81b60]" />
                </div>
                <h4 className="font-semibold text-sm mb-2">{benefit.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {benefit.description}
                </p>
              </motion.div>
            ))}
          </div>

          <div className="text-center">
            <div className="mt-4 flex justify-center">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles size={12} className="text-[#d81b60]" />
                <span>Incluso em todos os planos</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export { KanbanShowcase };
