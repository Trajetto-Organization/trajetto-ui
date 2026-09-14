import {
  Users,
  Car,
  Building2,
  Briefcase,
  Package,
  FileText,
  Container,
  Receipt,
} from "lucide-react";
import type { DashboardCountData } from "../overview-dashboard.types";

/**
 * `path` is the access key: the route registry decides whether the card is
 * shown, so a card can never outlive the permission or the module its page
 * needs.
 */
const statCards = (counts: DashboardCountData) => [
  {
    type: "vehicles",
    path: "vehicle",
    title: "Veículos",
    value: counts?.vehicles?.value || 0,
    change: counts?.vehicles?.change || 0,
    icon: <Car className="h-4 w-4 text-white" />,
    color: "#3b82f6",
  },
  {
    type: "drivers",
    path: "driver",
    title: "Motoristas",
    value: counts?.drivers?.value || 0,
    change: counts?.drivers?.change || 0,
    icon: <Users className="h-4 w-4 text-white" />,
    color: "#10b981",
  },
  {
    type: "businesses",
    path: "business",
    title: "Empresas",
    value: counts?.businesses?.value || 0,
    change: counts?.businesses?.change || 0,
    icon: <Briefcase className="h-4 w-4 text-white" />,
    color: "#8b5cf6",
  },
  {
    type: "branches",
    path: "branch",
    title: "Filiais",
    value: counts?.branches?.value || 0,
    change: counts?.branches?.change || 0,
    icon: <Building2 className="h-4 w-4 text-white" />,
    color: "#f97316",
  },
  {
    type: "parts",
    path: "part",
    title: "Peças",
    value: counts?.parts?.value || 0,
    change: counts?.parts?.change || 0,
    icon: <Container className="h-4 w-4 text-white" />,
    color: "#ec4899",
  },
  {
    type: "suppliers",
    path: "supplier",
    title: "Fornecedores",
    value: counts?.suppliers?.value || 0,
    change: counts?.suppliers?.change || 0,
    icon: <Package className="h-4 w-4 text-white" />,
    color: "#6366f1",
  },
  {
    type: "serviceOrders",
    path: "service-order",
    title: "Ordens de Serviço",
    value: counts?.serviceOrders?.value || 0,
    change: counts?.serviceOrders?.change || 0,
    icon: <FileText className="h-4 w-4 text-white" />,
    color: "#14b8a6",
  },
  {
    type: "users",
    path: "user-registration",
    title: "Usuários",
    value: counts?.users?.value || 0,
    change: counts?.users?.change || 0,
    icon: <Users className="h-4 w-4 text-white" />,
    color: "#f43f5e",
  },
  {
    type: "fines",
    path: "fine",
    title: "Multas",
    value: counts?.fines?.value || 0,
    change: counts?.fines?.change || 0,
    icon: <Receipt className="h-4 w-4 text-white" />,
    color: "#dc2626",
  },
];

const quickLinks = [
  {
    type: "users",
    title: "Gerenciar Usuários",
    path: "user-registration",
    icon: <Users className="h-6 w-6" />,
    color: "#3b82f6",
  },
  {
    type: "vehicles",
    title: "Veículos",
    path: "vehicle",
    icon: <Car className="h-6 w-6" />,
    color: "#10b981",
  },
  {
    type: "businesses",
    title: "Empresas",
    path: "business",
    icon: <Briefcase className="h-6 w-6" />,
    color: "#8b5cf6",
  },
  {
    type: "serviceOrders",
    title: "Ordens de Serviço",
    path: "service-order",
    icon: <FileText className="h-6 w-6" />,
    color: "#f97316",
  },
  {
    type: "drivers",
    title: "Motoristas",
    path: "driver",
    icon: <Users className="h-6 w-6" />,
    color: "#ec4899",
  },
  {
    type: "branches",
    title: "Filiais",
    path: "branch",
    icon: <Building2 className="h-6 w-6" />,
    color: "#6366f1",
  },
  {
    type: "parts",
    title: "Peças",
    path: "part",
    icon: <Container className="h-6 w-6" />,
    color: "#14b8a6",
  },
  {
    type: "suppliers",
    title: "Fornecedores",
    path: "supplier",
    icon: <Package className="h-6 w-6" />,
    color: "#f43f5e",
  },
  {
    type: "fines",
    title: "Multas",
    path: "fine",
    icon: <Receipt className="h-6 w-6" />,
    color: "#dc2626",
  },
];

export { statCards, quickLinks };
