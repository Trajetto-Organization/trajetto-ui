"use client";

import { Building2, Phone, Mail, MapPin } from "lucide-react";
import { StatConfig } from "../../_components/stats/dto";

/**
 * Statistics setup for the vendor page
 *
 * This file defines which statistics will be displayed and how.
 * You can easily add, remove or modify stats here.
 */
const supplierStats: StatConfig[] = [
  {
    key: "total-suppliers",
    title: "Total de Fornecedores",
    valueKey: "totalSuppliers",
    description: "Cadastrados no sistema",
    icon: Building2,
    variant: "primary",
  },
  {
    key: "with-telephone",
    title: "Com Telefone",
    valueKey: "withTelephone",
    icon: Phone,
    variant: "success",
    calculateValue: (data) => {
      const total = data.totalSuppliers || 0;
      const withPhone = data.withTelephone || 0;

      return total > 0
        ? `${withPhone} (${Math.round((withPhone / total) * 100)}%)`
        : "0";
    },
    description: "Contato telefônico",
  },
  {
    key: "with-email",
    title: "Com E-mail",
    valueKey: "withEmail",
    icon: Mail,
    variant: "primary",
    calculateValue: (data) => {
      const total = data.totalSuppliers || 0;
      const withEmail = data.withEmail || 0;

      return total > 0
        ? `${withEmail} (${Math.round((withEmail / total) * 100)}%)`
        : "0";
    },
    description: "Contato por e-mail",
  },
  {
    key: "by-state",
    title: "Por Estado",
    valueKey: "topStates",
    icon: MapPin,
    variant: "warning",
    description: "Principais estados",
  },
];

export { supplierStats };
