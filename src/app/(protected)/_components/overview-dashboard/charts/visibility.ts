/**
 * Whether the fleet charts (maintenance costs and status) belong on this
 * company's "Análise Gráfica" (DASH-MOD-1).
 *
 * Maintenance is Frotas: a company that hired only Entregas used to get an
 * empty "Custos de Manutenção" chart, a module it never bought. A MASTER sees
 * the whole platform, so the charts stay. Unknown modules (the session
 * lookup failed) are not a verdict: the API already sends no costs without
 * the module, and the chart then shows its own empty state.
 */
function showsFleetCharts(
  role: string | undefined,
  enabledModules: readonly string[] | null | undefined,
): boolean {
  if (role === "MASTER") return true;
  if (!enabledModules) return true;

  return enabledModules.includes("FLEET");
}

export { showsFleetCharts };
