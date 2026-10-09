import type { Metadata } from "next";

import { ProductPage, productMetadata } from "@/components/site/product";

export const metadata: Metadata = productMetadata("entregas");

/** The delivery module in depth (design: Trajetto Produto, module=entregas). */
const DeliveryManagementPage = (): JSX.Element => (
  <ProductPage module="entregas" />
);

export default DeliveryManagementPage;
