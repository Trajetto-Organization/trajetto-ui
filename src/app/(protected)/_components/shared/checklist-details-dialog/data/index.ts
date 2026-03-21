import { AlertTriangle, CheckCircle, HelpCircle } from "lucide-react";

// Field name → Portuguese label
const fieldLabels: Record<string, string> = {
  current_mileage: "Quilometragem",
  tires_condition: "Condição dos Pneus",
  fuel_level_adequate: "Nível de Combustível",
  headlights_working: "Faróis",
  taillights_working: "Lanternas Traseiras",
  turn_signals_working: "Setas",
  bumpers_condition: "Para-choques",
  windshield_condition: "Para-brisa",
  mirrors_condition: "Espelhos",
  seatbelts_working: "Cintos de Segurança",
  dashboard_working: "Painel",
  steering_wheel_condition: "Volante",
  brakes_working: "Freios",
  clutch_working: "Embreagem",
  oil_level_adequate: "Nível de Óleo",
  radiator_water_adequate: "Água do Radiador",
  brake_fluid_adequate: "Fluído de Freio",
  battery_condition: "Bateria",
  spare_tire_condition: "Estepe",
  driver_license_valid: "CNH Válida",
  vehicle_documents_valid: "Documentos do Veículo",
  insurance_valid: "Seguro Válido",
  fire_extinguisher_valid: "Extintor de Incêndio",
  warning_triangle_present: "Triângulo de Sinalização",
  jack_present: "Macaco",
};

// Per-field AI analysis status config
const fieldStatusConfig: Record<
  string,
  { label: string; color: string; Icon: React.ElementType }
> = {
  confirmed: {
    label: "Confirmado",
    color: "bg-green-100 text-green-800 border-green-200",
    Icon: CheckCircle,
  },
  contradicts: {
    label: "Contradiz",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    Icon: AlertTriangle,
  },
  inconclusive: {
    label: "Inconclusivo",
    color: "bg-gray-100 text-gray-600 border-gray-200",
    Icon: HelpCircle,
  },
};

// Overall AI status config
const aiStatusConfig: Record<string, { color: string; label: string }> = {
  pending: {
    color: "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300",
    label: "Pendente",
  },
  analyzing: {
    color:
      "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 animate-pulse",
    label: "Analisando...",
  },
  verified: {
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
    label: "Verificado IA",
  },
  issues_found: {
    color:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
    label: "Problemas Encontrados",
  },
  error: {
    color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    label: "Erro",
  },
  skipped: {
    color: "bg-gray-50 text-gray-500 dark:bg-gray-900 dark:text-gray-400",
    label: "Não Analisado",
  },
};

// Overall condition config
const overallConditionConfig: Record<string, { label: string; color: string }> =
  {
    approved: {
      label: "Aprovado",
      color: "bg-green-100 text-green-800",
    },
    approved_with_restrictions: {
      label: "Aprovado c/ Restrições",
      color: "bg-yellow-100 text-yellow-800",
    },
    rejected: {
      label: "Rejeitado",
      color: "bg-red-100 text-red-800",
    },
  };

export {
  fieldLabels,
  aiStatusConfig,
  overallConditionConfig,
  fieldStatusConfig,
};
