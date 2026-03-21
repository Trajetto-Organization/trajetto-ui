import { GripVertical, Search, ShieldCheck } from "lucide-react";
import type { Priority, ShowcaseColumn } from "../kanban-showcase.types";

const priorityConfig: Record<Priority, { label: string; badgeColor: string }> =
  {
    low: {
      label: "Baixa",
      badgeColor:
        "bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30",
    },
    medium: {
      label: "Média",
      badgeColor:
        "bg-amber-100 text-amber-600 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30",
    },
    high: {
      label: "Alta",
      badgeColor:
        "bg-red-100 text-red-600 border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30",
    },
    urgent: {
      label: "Urgente",
      badgeColor:
        "bg-purple-100 text-purple-600 border-purple-200 dark:bg-purple-500/15 dark:text-purple-400 dark:border-purple-500/30",
    },
  };

const columns: ShowcaseColumn[] = [
  {
    title: "Pendente",
    color: "#64748b",
    cards: [
      {
        title: "Revisão do veículo ABC-1234",
        description: "Agendar revisão preventiva conforme última quilometragem",
        priority: "high",
        dueDate: "15 Mar",
        user: "JS",
        userColor: "bg-blue-500",
      },
      {
        title: "Renovar seguro da frota B",
        description: "Documentação expira no final do mês",
        priority: "urgent",
        dueDate: "20 Mar",
        user: "MO",
        userColor: "bg-emerald-500",
        overdue: true,
      },
      {
        title: "Atualizar cadastro de motoristas",
        description: "Novos motoristas precisam de cadastro no sistema",
        priority: "medium",
        dueDate: "22 Mar",
        user: "RA",
        userColor: "bg-orange-500",
      },
    ],
  },
  {
    title: "Em andamento",
    color: "#3b82f6",
    cards: [
      {
        title: "Checklist semanal - Filial Centro",
        description: "Verificar condições de todos os veículos da filial",
        priority: "medium",
        dueDate: "12 Mar",
        user: "CP",
        userColor: "bg-[#d81b60]",
      },
      {
        title: "Calibragem dos pneus - Lote 3",
        description: "Realizar calibragem nos 5 veículos do lote",
        priority: "low",
        dueDate: "18 Mar",
        user: "RA",
        userColor: "bg-orange-500",
      },
      {
        title: "Troca de óleo - Caminhão GHI-9012",
        description: "Manutenção preventiva programada",
        priority: "high",
        dueDate: "13 Mar",
        user: "JS",
        userColor: "bg-blue-500",
      },
      {
        title: "Vistoria semestral da frota A",
        description: "Inspeção completa de todos os 8 veículos",
        priority: "medium",
        dueDate: "25 Mar",
        user: "MO",
        userColor: "bg-emerald-500",
      },
    ],
  },
  {
    title: "Em revisão",
    color: "#f59e0b",
    cards: [
      {
        title: "Laudo técnico - Van JKL-3456",
        description: "Aguardando aprovação do gestor para liberação",
        priority: "high",
        dueDate: "10 Mar",
        user: "CP",
        userColor: "bg-[#d81b60]",
      },
      {
        title: "Orçamento de peças - Motor XYZ",
        description: "Comparar fornecedores e aprovar melhor proposta",
        priority: "urgent",
        dueDate: "11 Mar",
        user: "JS",
        userColor: "bg-blue-500",
        overdue: true,
      },
    ],
  },
  {
    title: "Aprovado",
    color: "#8b5cf6",
    cards: [
      {
        title: "Troca de freios - Caminhão MNO-7890",
        description: "Peças aprovadas, aguardando agendamento na oficina",
        priority: "high",
        dueDate: "14 Mar",
        user: "JS",
        userColor: "bg-blue-500",
      },
      {
        title: "Instalação de rastreador - Frota C",
        description: "3 veículos aprovados para instalação do GPS",
        priority: "medium",
        dueDate: "17 Mar",
        user: "MO",
        userColor: "bg-emerald-500",
      },
      {
        title: "Pintura externa - Van PQR-4567",
        description: "Orçamento aprovado pelo gestor da filial",
        priority: "low",
        dueDate: "21 Mar",
        user: "RA",
        userColor: "bg-orange-500",
      },
    ],
  },
  {
    title: "Concluído",
    color: "#10b981",
    cards: [
      {
        title: "Abastecimento verificado por IA",
        description: "Todos os comprovantes validados automaticamente",
        priority: "medium",
        dueDate: "08 Mar",
        user: "MO",
        userColor: "bg-emerald-500",
        completed: true,
      },
      {
        title: "Licenciamento DEF-5678 renovado",
        description: "Documento atualizado no sistema",
        priority: "low",
        dueDate: "05 Mar",
        user: "CP",
        userColor: "bg-[#d81b60]",
        completed: true,
      },
      {
        title: "Treinamento novos motoristas",
        description: "6 motoristas concluíram o treinamento de segurança",
        priority: "low",
        dueDate: "03 Mar",
        user: "RA",
        userColor: "bg-orange-500",
        completed: true,
      },
    ],
  },
];

const benefits = [
  {
    icon: GripVertical,
    title: "Arraste e solte",
    description:
      "Mova cards entre colunas com facilidade. Reordene suas colunas e cards com interface intuitiva de arrastar e soltar.",
  },
  {
    icon: Search,
    title: "Busca inteligente",
    description:
      "Busque por título, descrição, usuário ou prioridade. Encontre qualquer card instantaneamente.",
  },
  {
    icon: ShieldCheck,
    title: "Controle de prioridades",
    description:
      "Organize por 4 níveis de prioridade: Baixa, Média, Alta e Urgente. Com datas de vencimento e status de conclusão.",
  },
];

export { columns, benefits, priorityConfig };
