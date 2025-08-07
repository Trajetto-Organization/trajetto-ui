import { CheckCircle, AlertCircle, ShieldAlert, Truck } from "lucide-react";

const vehicleStatus = [
  {
    label: "Ativo",
    value: "ACTIVE",
    icon: CheckCircle,
  },
  {
    label: "Inativo",
    value: "INACTIVE",
    icon: AlertCircle,
  },
  {
    label: "Bloqueado",
    value: "BLOCKED",
    icon: ShieldAlert,
  },
  {
    label: "Em rota",
    value: "IN_ROUTE",
    icon: Truck,
  },
];

export { vehicleStatus };
