import Link from "next/link";

import { legalPath } from "@/lib/content/legal-documents";

const Terms = (): JSX.Element => {
  return (
    <div
      className="text-sm text-muted-foreground
      text-center space-x-1 p-5"
    >
      <span>Ao clicar em continuar, você concorda com nossos</span> <br />
      <Link
        data-test="redirect-terms-of-service"
        href={legalPath("termos")}
        className="text-[#d81b60] dark:text-[#ff4081]
        dark:hover:opacity-70 hover:text-muted-foreground 
        transition duration-200"
      >
        Termos de Uso
      </Link>
      <span>e</span>
      <Link
        data-test="redirect-privacy-policy"
        href={legalPath("privacidade")}
        className="text-[#d81b60] dark:text-[#ff4081]
        dark:hover:opacity-70 hover:text-muted-foreground 
        transition duration-200"
      >
        Política de Privacidade.
      </Link>
    </div>
  );
};

export { Terms };
