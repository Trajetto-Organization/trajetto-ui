import Link from "next/link";

const Terms = (): JSX.Element => {
  return (
    <div
      className="text-sm text-muted-foreground
      text-center space-x-1 p-5"
    >
      <span>Ao clicar em continuar, você concorda com nossos</span> <br />
      <Link
        data-test="redirect-terms-of-service"
        href="/legal/terms"
        className="text-[#d81b60] dark:text-[#ff4081]
        dark:hover:opacity-70 hover:text-muted-foreground 
        transition duration-200"
      >
        Termos de Serviço
      </Link>
      <span>e</span>
      <Link
        data-test="redirect-privacy-policy"
        href="/legal/privacy"
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
