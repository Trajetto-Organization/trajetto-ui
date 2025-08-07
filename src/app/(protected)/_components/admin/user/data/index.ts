import { ShieldAlert, ShieldCheck } from "lucide-react";

const twoFactor = [
  {
    label: "Habilitado",
    value: true,
    icon: ShieldCheck,
  },
  {
    label: "Desabilitado",
    value: false,
    icon: ShieldAlert,
  },
];

const emailVerified = [
  {
    label: "Verificado",
    value: true,
    icon: ShieldCheck,
  },
  {
    label: "Não verificado",
    value: false,
    icon: ShieldAlert,
  },
];

export { twoFactor, emailVerified };
