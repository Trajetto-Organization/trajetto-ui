import type { Metadata } from "next";

import { ProductPage, productMetadata } from "@/components/site/product";

export const metadata: Metadata = productMetadata("frotas");

/** The fleet module in depth (design: Trajetto Produto, module=frotas). */
const FleetManagementPage = (): JSX.Element => <ProductPage module="frotas" />;

export default FleetManagementPage;
