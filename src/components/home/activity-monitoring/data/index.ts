interface ActivityRow {
  id: string;
  type: string;
  action: "create" | "update" | "delete";
  description: string;
  userName: string;
  userEmail: string;
  user: "collaborator" | "administrator";
  business: string;
  status: string;
  date: string;
}

// Action badge config — matches the real app
const actionConfig = {
  create: {
    label: "Criar",
    className:
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30",
  },
  update: {
    label: "Atualizar",
    className:
      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30",
  },
  delete: {
    label: "Deletar",
    className:
      "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30",
  },
};

const roleConfig = {
  administrator: {
    label: "Admin",
    className:
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30",
  },
  collaborator: {
    label: "Colaborador",
    className:
      "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-500/15 dark:text-slate-400 dark:border-slate-500/30",
  },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  Ativo: {
    label: "Ativo",
    className:
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30",
  },
  Criado: {
    label: "Criado",
    className:
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30",
  },
  Atualizado: {
    label: "Atualizado",
    className:
      "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-400 dark:border-indigo-500/30",
  },
  Completo: {
    label: "Completo",
    className:
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30",
  },
  Pendente: {
    label: "Pendente",
    className:
      "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-500/15 dark:text-yellow-400 dark:border-yellow-500/30",
  },
  Deletado: {
    label: "Deletado",
    className:
      "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30",
  },
};

const typeConfig: Record<string, { label: string; className: string }> = {
  User: {
    label: "Usuário",
    className:
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30",
  },
  Vehicle: {
    label: "Veículo",
    className:
      "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-400 dark:border-sky-500/30",
  },
  Driver: {
    label: "Motorista",
    className:
      "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/15 dark:text-orange-400 dark:border-orange-500/30",
  },
  Fuel: {
    label: "Combustível",
    className:
      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30",
  },
  Checklist: {
    label: "Checklist",
    className:
      "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-500/15 dark:text-pink-400 dark:border-pink-500/30",
  },
  Branch: {
    label: "Filial",
    className:
      "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-500/15 dark:text-teal-400 dark:border-teal-500/30",
  },
};

const placeholderRows: ActivityRow[] = [
  {
    id: "act-001",
    type: "Vehicle",
    action: "create",
    description: "Veículo ABC-1234 cadastrado na frota da Filial Centro",
    userName: "João Silva",
    userEmail: "joao@empresa.com",
    user: "administrator",
    business: "Transportes São Paulo",
    status: "Criado",
    date: "11/03/2026 14:32",
  },
  {
    id: "act-002",
    type: "Checklist",
    action: "create",
    description: "Checklist veicular criado para DEF-5678 com verificação IA",
    userName: "Maria Oliveira",
    userEmail: "maria@empresa.com",
    user: "collaborator",
    business: "Transportes São Paulo",
    status: "Completo",
    date: "11/03/2026 14:28",
  },
  {
    id: "act-003",
    type: "Fuel",
    action: "update",
    description: "Abastecimento #4521 atualizado — quilometragem corrigida",
    userName: "Carlos Pereira",
    userEmail: "carlos@empresa.com",
    user: "administrator",
    business: "Logística Express",
    status: "Atualizado",
    date: "11/03/2026 14:15",
  },
  {
    id: "act-004",
    type: "Driver",
    action: "update",
    description: "CNH do motorista Roberto atualizada — validade 2028",
    userName: "Ana Costa",
    userEmail: "ana@empresa.com",
    user: "administrator",
    business: "Transportes São Paulo",
    status: "Ativo",
    date: "11/03/2026 13:55",
  },
  {
    id: "act-005",
    type: "User",
    action: "create",
    description: "Novo colaborador adicionado à empresa com perfil Colaborador",
    userName: "Pedro Costa",
    userEmail: "pedro@empresa.com",
    user: "collaborator",
    business: "Logística Express",
    status: "Criado",
    date: "11/03/2026 13:40",
  },
  {
    id: "act-006",
    type: "Vehicle",
    action: "delete",
    description: "Veículo GHI-9012 removido da frota — baixa por sinistro",
    userName: "João Silva",
    userEmail: "joao@empresa.com",
    user: "administrator",
    business: "Transportes São Paulo",
    status: "Deletado",
    date: "11/03/2026 13:22",
  },
  {
    id: "act-007",
    type: "Branch",
    action: "create",
    description: "Nova filial 'Filial Norte' criada em Manaus",
    userName: "Lucas Silva",
    userEmail: "lucas@empresa.com",
    user: "collaborator",
    business: "Logística Express",
    status: "Criado",
    date: "11/03/2026 12:58",
  },
];

const tableHeaders = [
  { key: "type", label: "Tipo" },
  { key: "action", label: "Ação" },
  { key: "description", label: "Descrição" },
  { key: "user", label: "Usuário" },
  { key: "role", label: "Papel" },
  { key: "business", label: "Empresa" },
  { key: "status", label: "Status" },
  { key: "date", label: "Data" },
];

export {
  tableHeaders,
  placeholderRows,
  actionConfig,
  roleConfig,
  statusConfig,
  typeConfig,
};
