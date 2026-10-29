import type { ActivityTrend } from "../area-chart.types";

const METRICS = [
  {
    key: "vehicles" as const,
    label: "Veículos",
    color: "#3b82f6",
    roles: ["ALL"],
  },
  {
    key: "drivers" as const,
    label: "Motoristas",
    color: "#10b981",
    roles: ["ALL"],
  },
  {
    key: "businesses" as const,
    label: "Empresas",
    color: "#8b5cf6",
    roles: ["MASTER"],
  },
  {
    key: "branches" as const,
    label: "Filiais",
    color: "#f97316",
    roles: ["ALL"],
  },
  { key: "parts" as const, label: "Peças", color: "#ec4899", roles: ["ALL"] },
  {
    key: "suppliers" as const,
    label: "Fornecedores",
    color: "#6366f1",
    roles: ["ALL"],
  },
  {
    key: "serviceOrders" as const,
    label: "Ordens de Serviço",
    color: "#14b8a6",
    roles: ["ALL"],
  },
  {
    key: "users" as const,
    label: "Usuários",
    color: "#f43f5e",
    roles: ["MASTER", "BUSINESS_ADMIN"],
  },
  {
    key: "fines" as const,
    label: "Multas",
    color: "#dc2626",
    roles: ["MASTER", "BUSINESS_ADMIN"],
  },

  // The deliveries module. Drawn only when the data carries them — see
  // `availableMetrics`, which is what keeps a company that never hired the
  // module from getting two flat lines at zero.
  {
    key: "deliveries" as const,
    label: "Entregas",
    color: "#0ea5e9",
    roles: ["ALL"],
  },
  {
    key: "routes" as const,
    label: "Rotas",
    color: "#a855f7",
    roles: ["ALL"],
  },
] satisfies readonly {
  key: keyof ActivityTrend;
  label: string;
  color: string;
  roles: ("ALL" | "MASTER" | "BUSINESS_ADMIN")[];
}[];

export { METRICS };
