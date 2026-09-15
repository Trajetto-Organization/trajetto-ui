import { Step } from "@/components/step";
import { Reveal } from "@/components/shared/reveal";

import {
  ScanEye,
  Activity,
  ArrowRight,
  Inbox,
  Sparkles,
  Search,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

import {
  tableHeaders,
  placeholderRows,
  actionConfig,
  roleConfig,
  statusConfig,
  typeConfig,
} from "./data";

const ActivityMonitoring = (): JSX.Element => {
  const rows = placeholderRows;
  const isEmpty = rows.length === 0;

  return (
    <>
      <div
        className="w-full flex flex-row
        justify-center h-24 mb-16"
      >
        <Step />
      </div>
      <section className="relative py-20 overflow-hidden">
        {/* Subtle background gradient */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-muted/30
          via-transparent to-muted/30 pointer-events-none"
        />

        <div className="container relative">
          <Reveal className="text-center mb-16">
            <div
              className="inline-flex items-center gap-2
              rounded-full border px-4 py-1.5 mb-6"
            >
              <ScanEye size={16} className="text-[#d81b60]" />
              <span className="text-sm font-medium text-muted-foreground">
                Registro de Atividades
              </span>
            </div>

            <div className="text-center space-y-4">
              <h2
                className="text-4xl font-bold
                tracking-tight lg:text-5xl"
              >
                Cada ação registrada, nada passa despercebido.
              </h2>

              <p
                className="text-lg text-muted-foreground
                max-w-2xl mx-auto"
              >
                Monitore criações, atualizações e exclusões de veículos,
                motoristas, abastecimentos, checklists e mais. Saiba quem fez o
                quê e quando.
              </p>
            </div>
          </Reveal>

          {/* Table preview */}
          <Reveal duration={700}>
            <div
              className="rounded-2xl border shadow-lg 
              overflow-hidden bg-background"
            >
              {/* Toolbar */}
              <div
                className="flex flex-col sm:flex-row items-start sm:items-center
                justify-between gap-3 px-6 py-4 border-b bg-muted/20"
              >
                <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
                  <div
                    className="w-8 h-8 rounded-lg bg-[#d81b60]/10
                    flex items-center justify-center flex-shrink-0"
                  >
                    <Activity size={16} className="text-[#d81b60]" />
                  </div>

                  {/* Search mock */}
                  <div className="relative flex-1 min-w-0 sm:max-w-sm">
                    <Search
                      className="absolute left-3 top-1/2 transform
                      -translate-y-1/2 text-muted-foreground h-4 w-4"
                    />
                    <div
                      className="w-full h-9 rounded-md border bg-background
                      pl-10 pr-4 flex items-center"
                    >
                      <span className="text-sm text-muted-foreground truncate">
                        Procurar atividade...
                      </span>
                    </div>
                  </div>

                  {/* Filter buttons mock */}
                  <div className="hidden md:flex items-center gap-2">
                    {["Tipo", "Ação", "Status"].map((filter) => (
                      <div
                        key={filter}
                        className="inline-flex items-center gap-1.5 rounded-lg
                        border px-3 py-1.5 text-xs text-muted-foreground
                        hover:bg-muted/50 transition-colors cursor-default"
                      >
                        <SlidersHorizontal size={11} />
                        {filter}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-2">
                  <div
                    className="inline-flex items-center gap-1.5 rounded-lg
                    border px-3 py-1.5 text-xs text-muted-foreground cursor-default"
                  >
                    <RefreshCw size={12} />
                    <span className="hidden sm:inline">Revalidar</span>
                  </div>
                </div>
              </div>

              {isEmpty ? (
                /* Empty state */
                <div className="py-20 px-6 text-center">
                  <div
                    className="mx-auto w-16 h-16 rounded-full bg-muted/50
                    flex items-center justify-center mb-4"
                  >
                    <Inbox size={28} className="text-muted-foreground/50" />
                  </div>
                  <h4 className="font-semibold text-sm mb-2">
                    Nenhuma atividade registrada
                  </h4>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6">
                    As atividades da sua empresa aparecerão aqui conforme
                    veículos, motoristas e registros forem criados.
                  </p>
                  <button
                    className="inline-flex items-center gap-2 rounded-full
                    bg-[#d81b60] px-5 py-2.5 text-sm font-medium text-white
                    shadow-lg shadow-[#d81b60]/20
                    hover:bg-[#c2185b] transition-all duration-300
                    focus-visible:outline-none focus-visible:ring-2
                    focus-visible:ring-[#d81b60] focus-visible:ring-offset-2
                    hover:scale-[1.02] active:scale-[0.98]"
                    aria-label="Começar a usar o sistema"
                  >
                    Começar agora
                    <ArrowRight size={14} />
                  </button>
                </div>
              ) : (
                /* Table */
                <ScrollArea className="w-full">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/10">
                        {tableHeaders.map((header) => (
                          <th
                            key={header.key}
                            className="px-4 py-3 text-left text-xs font-medium
                            text-muted-foreground uppercase tracking-wider
                            whitespace-nowrap"
                          >
                            {header.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {rows.map((row, index) => {
                        const action = actionConfig[row.action];
                        const role = roleConfig[row.user];

                        const status = statusConfig[row.status] ?? {
                          label: row.status,
                          className:
                            "bg-slate-100 text-slate-600 border-slate-200",
                        };
                        const type = typeConfig[row.type] ?? {
                          label: row.type,
                          className:
                            "bg-blue-100 text-blue-700 border-blue-200",
                        };

                        // Animated on the row itself rather than through
                        // `Reveal`: that renders a div, and a div inside a
                        // tbody is invalid HTML that browsers hoist out of
                        // the table.
                        return (
                          <tr
                            key={row.id}
                            className="animate-fade-in hover:bg-muted/30
                            transition-colors duration-150"
                            style={{ animationDelay: `${index * 60}ms` }}
                          >
                            {/* Type */}
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center rounded-full
                                border px-2.5 py-0.5 text-[11px] font-medium ${type.className}`}
                              >
                                {type.label}
                              </span>
                            </td>

                            {/* Action */}
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center rounded-full
                                border px-2.5 py-0.5 text-[11px] font-medium ${action.className}`}
                              >
                                {action.label}
                              </span>
                            </td>

                            {/* Description */}
                            <td className="px-4 py-3.5 max-w-[300px]">
                              <p
                                className="text-sm text-foreground/80 truncate"
                                title={row.description}
                              >
                                {row.description}
                              </p>
                            </td>

                            {/* User */}
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <div>
                                <p className="text-sm font-medium">
                                  {row.userName}
                                </p>
                                <p
                                  className="text-xs text-muted-foreground truncate max-w-[200px]"
                                  title={row.userEmail}
                                >
                                  {row.userEmail}
                                </p>
                              </div>
                            </td>

                            {/* Role */}
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center rounded-full
                                border px-2.5 py-0.5 text-[11px] font-medium ${role.className}`}
                              >
                                {role.label}
                              </span>
                            </td>

                            {/* Business */}
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <p
                                className="text-sm text-muted-foreground truncate max-w-[180px]"
                                title={row.business}
                              >
                                {row.business}
                              </p>
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center rounded-full
                                border px-2.5 py-0.5 text-[11px] font-medium ${status.className}`}
                              >
                                {status.label}
                              </span>
                            </td>

                            {/* Date */}
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <span className="text-sm text-muted-foreground">
                                {row.date}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              )}

              {/* Footer */}
              {!isEmpty && (
                <div
                  className="flex items-center justify-between
                  px-6 py-4 border-t bg-muted/10"
                >
                  <p className="text-xs text-muted-foreground">
                    Exibindo {rows.length} de 1.247 atividades
                  </p>
                  <button
                    className="inline-flex items-center gap-2
                    text-sm font-medium text-[#d81b60]
                    hover:text-[#c2185b] transition-all duration-200
                    focus-visible:outline-none focus-visible:ring-2
                    focus-visible:ring-[#d81b60] focus-visible:ring-offset-2
                    rounded-lg px-2 py-1
                    hover:translate-x-1"
                    aria-label="Ver todas as atividades no painel"
                  >
                    Ver todas as atividades
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Bottom accent */}
            <div className="mt-6 flex justify-center">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles size={12} className="text-[#d81b60]" />
                <span>Toda ação é registrada automaticamente</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
};

export { ActivityMonitoring };
