import { Badge } from "@/components/ui/badge";
import type { StatusBadgeProps } from "../shared/common.types";

/**
 * Same soft palette the activity table uses, so a status reads the same
 * wherever it appears — the solid fills used before made this the loudest
 * column of an otherwise quiet table.
 */
const STATUS_CLASSES: Record<string, string> = {
  Ativo: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200",
  Inativo: "bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200",
  Bloqueado: "bg-red-100 text-red-800 border-red-200 hover:bg-red-200",
  "Em Rota": "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200",
  Completo:
    "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200",
  Pendente:
    "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200",
  Atualizado:
    "bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200",
  Deletado: "bg-red-100 text-red-800 border-red-200 hover:bg-red-200",
  Criado: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200",
  Entregue:
    "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200",
  Insucesso: "bg-red-100 text-red-800 border-red-200 hover:bg-red-200",
  Cancelada: "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200",
};

const FALLBACK_CLASS =
  "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200";

const getStatusBadge = (status: StatusBadgeProps): JSX.Element => {
  return (
    <Badge
      variant="outline"
      className={STATUS_CLASSES[status] ?? FALLBACK_CLASS}
    >
      {status}
    </Badge>
  );
};

export { getStatusBadge };
