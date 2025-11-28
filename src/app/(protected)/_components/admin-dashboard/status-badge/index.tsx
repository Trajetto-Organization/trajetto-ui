import { Badge } from "@/components/ui/badge";
import { StatusBadgeProps } from "../dto";

const getStatusBadge = (status: StatusBadgeProps) => {
  switch (status) {
    case "Ativo":
      return (
        <Badge variant="outline" className="bg-green-600 text-white">
          {status}
        </Badge>
      );
    case "Inativo":
      return (
        <Badge variant="outline" className="bg-slate-400 text-white">
          {status}
        </Badge>
      );
    case "Bloqueado":
      return <Badge variant="destructive">{status}</Badge>;
    case "Em Rota":
      return (
        <Badge variant="outline" className="bg-blue-500 text-white">
          {status}
        </Badge>
      );
    case "Completo":
      return (
        <Badge variant="outline" className="bg-emerald-500 text-white">
          {status}
        </Badge>
      );
    case "Pendente":
      return (
        <Badge variant="outline" className="bg-yellow-400 text-white">
          {status}
        </Badge>
      );
    case "Atualizado":
      return (
        <Badge variant="outline" className="bg-indigo-500 text-white">
          {status}
        </Badge>
      );
    case "Deletado":
      return <Badge variant="destructive">{status}</Badge>;
    case "Criado":
      return (
        <Badge variant="outline" className="bg-green-600 text-white">
          {status}
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

export { getStatusBadge };
