"use client";

import { Building2, Mail, MapPin, Phone } from "lucide-react";

import { PageStats } from "@/app/(protected)/_components/shared/stats/page-stats";
import type { StatConfig } from "@/app/(protected)/_components/shared/stats/shared/common.types";

import type { SupplierSearchMeta } from "../lib/server-table";
import { countWithShare, supplierStatsData } from "../lib/stats-data";

const supplierStats: StatConfig[] = [
  {
    key: "total-suppliers",
    title: "Total de Fornecedores",
    valueKey: "totalSuppliers",
    description: "Na busca e nos filtros atuais",
    icon: Building2,
    variant: "primary",
  },
  {
    key: "with-telephone",
    title: "Com Telefone",
    valueKey: "withTelephone",
    icon: Phone,
    variant: "success",
    calculateValue: (data) =>
      countWithShare(data.withTelephone || 0, data.totalSuppliers || 0),
    description: "Contato telefônico",
  },
  {
    key: "with-email",
    title: "Com E-mail",
    valueKey: "withEmail",
    icon: Mail,
    variant: "primary",
    calculateValue: (data) =>
      countWithShare(data.withEmail || 0, data.totalSuppliers || 0),
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

/**
 * On the client because the card configs carry icon components. The numbers
 * are the API's, over the whole company (decision 8.8).
 */
const SupplierStats = ({
  searchMeta,
}: {
  searchMeta?: SupplierSearchMeta;
}): JSX.Element => (
  <PageStats
    stats={supplierStats}
    data={supplierStatsData(searchMeta)}
    columns={4}
  />
);

export { SupplierStats };
