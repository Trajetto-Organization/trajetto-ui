import {
  Car,
  Users,
  Building2,
  Briefcase,
  Container,
  Package,
  FileText,
  Receipt,
  LayoutDashboard,
  Kanban,
  Split,
  NotepadText,
  Truck,
  Logs,
} from "lucide-react";

import { DemoStep, StatCard, Activity, QuickLink, SidebarItem } from "../types";

const demoSteps: DemoStep[] = [
  {
    title: "Bem-vindo ao Dashboard",
    description: "Visão geral completa da sua operação em tempo real",
    highlight: "overview",
    tooltip: {
      title: "Dashboard Inteligente",
      content:
        "Monitore todos os aspectos da sua frota em uma única tela centralizada.",
      target: "[data-demo-target='overview']",
      preferredPosition: "top",
    },
  },
  {
    title: "Cards Estatísticos",
    description: "Métricas importantes da frota",
    highlight: "stats",
    tooltip: {
      title: "Estatísticas da frota",
      content:
        "Acompanhe veículos, motoristas, e muito mais com dados atualizados.",
      target: "[data-demo-target='stats']",
      preferredPosition: "bottom",
    },
  },
  {
    title: "Atividades Recentes",
    description: "Histórico detalhado de todas as ações",
    highlight: "activity",
    tooltip: {
      title: "Monitoramento de Atividades",
      content:
        "Veja quem fez o quê e quando, com rastreamento completo de ações.",
      target: "[data-demo-target='activity']",
    },
  },
  {
    title: "Links Rápidos",
    description: "Acesso direto às funcionalidades principais",
    highlight: "quicklinks",
    tooltip: {
      title: "Navegação Eficiente",
      content: "Acesse rapidamente as seções mais utilizadas do sistema.",
      target: "[data-demo-target='quicklinks']",
    },
  },
];

const fakeStats: StatCard[] = [
  { title: "Veículos", value: 24, change: 12, icon: Car, color: "#3b82f6" },
  {
    title: "Motoristas",
    value: 18,
    change: 5,
    icon: Users,
    color: "#10b981",
  },
  {
    title: "Empresas",
    value: 3,
    change: 1,
    icon: Briefcase,
    color: "#8b5cf6",
  },
  {
    title: "Filiais",
    value: 8,
    change: 2,
    icon: Building2,
    color: "#f97316",
  },
  {
    title: "Peças",
    value: 156,
    change: 23,
    icon: Container,
    color: "#ec4899",
  },
  {
    title: "Fornecedores",
    value: 12,
    change: 3,
    icon: Package,
    color: "#6366f1",
  },
  {
    title: "Ordens de Serviço",
    value: 45,
    change: 8,
    icon: FileText,
    color: "#14b8a6",
  },
  { title: "Multas", value: 7, change: -2, icon: Receipt, color: "#dc2626" },
];

const fakeActivities: Activity[] = [
  {
    type: "Veículo",
    description: "Novo veículo ABC-1234 adicionado",
    user: "João Silva",
    email: "joao@empresa.com",
    date: "Hoje, 14:30",
    status: "Criado",
  },
  {
    type: "Multa",
    description: "Multa registrada para veículo XYZ-5678",
    user: "Maria Santos",
    email: "maria@empresa.com",
    date: "Hoje, 13:15",
    status: "Pendente",
  },
  {
    type: "Ordem de serviço",
    description: "Manutenção preventiva concluída",
    user: "Carlos Lima",
    email: "carlos@empresa.com",
    date: "Hoje, 11:45",
    status: "Completo",
  },
  {
    type: "Motorista",
    description: "Perfil de motorista atualizado",
    user: "Ana Costa",
    email: "ana@empresa.com",
    date: "Ontem, 16:20",
    status: "Atualizado",
  },
];

const fakeQuickLinks: QuickLink[] = [
  { title: "Gerenciar Usuários", icon: Users, color: "#3b82f6" },
  { title: "Veículos", icon: Car, color: "#10b981" },
  { title: "Empresas", icon: Briefcase, color: "#8b5cf6" },
  { title: "Ordens de Serviço", icon: FileText, color: "#f97316" },
  { title: "Motoristas", icon: Users, color: "#ec4899" },
  { title: "Filiais", icon: Building2, color: "#6366f1" },
  { title: "Peças", icon: Container, color: "#14b8a6" },
  { title: "Multas", icon: Receipt, color: "#dc2626" },
];

const sidebarItems: SidebarItem[] = [
  {
    title: "Dashboard",
    shortTitle: "Dash",
    icon: LayoutDashboard,
    isActive: true,
  },
  {
    title: "Kanban",
    icon: Kanban,
  },
  {
    title: "Cadastro de Filiais",
    icon: Split,
  },
  {
    title: "Multas",
    icon: NotepadText,
  },
  {
    title: "Usuários",
    icon: Users,
    hasChevron: true,
  },
  {
    title: "Fornecedores",
    icon: Container,
    hasChevron: true,
  },
  {
    title: "Veículos",
    icon: Truck,
    hasChevron: true,
  },
  {
    title: "Ordens",
    icon: Logs,
    hasChevron: true,
  },
];

export { demoSteps, fakeStats, fakeActivities, fakeQuickLinks, sidebarItems };
