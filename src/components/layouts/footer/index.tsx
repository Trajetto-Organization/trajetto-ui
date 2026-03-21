import Link from "next/link";
import {
  InstagramLogoIcon,
  LinkedInLogoIcon,
  TwitterLogoIcon,
} from "@radix-ui/react-icons";

import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { cn } from "@/lib/utils";

const Footer = (): JSX.Element => {
  const currentYear = new Date().getFullYear();
  const footerLinks = [
    {
      title: "Navegação",
      links: [{ item: "Contato", href: "/contact" }],
    },
    {
      title: "Empresa",
      links: [{ item: "Sobre nós", href: "/about" }],
    },
    {
      title: "Legal",
      links: [
        { item: "Privacidade", href: "/legal/privacy" },
        { item: "Termos", href: "/legal/terms" },
      ],
    },
  ];

  return (
    <footer className="bg-card border-t">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <h3 className="font-bold text-xl">Trajetto</h3>
            <p className="text-muted-foreground">
              Controle total da sua frota em uma única plataforma.
            </p>
            <div className="flex space-x-4">
              <Link
                aria-label="Redirecionar para o linkedin"
                className={cn(
                  buttonVariants({ size: "icon", variant: "ghost" }),
                )}
                target="_blank"
                href="https://www.linkedin.com/company/intrajetto"
              >
                <LinkedInLogoIcon className="h-5 w-5" />
              </Link>
              <Link
                aria-label="Redirecionar para o instagram"
                className={cn(
                  buttonVariants({ size: "icon", variant: "ghost" }),
                )}
                target="_blank"
                href="https://www.instagram.com/trajetto_official"
              >
                <InstagramLogoIcon className="h-5 w-5" />
              </Link>
              <Link
                aria-label="Redirecionar para o twitter"
                className={cn(
                  buttonVariants({ size: "icon", variant: "ghost" }),
                )}
                target="_blank"
                href=""
              >
                <TwitterLogoIcon className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {footerLinks.map((section) => (
            <div key={section.title} className="space-y-4">
              <h4 className="font-semibold">{section.title}</h4>
              <ul className="space-y-2">
                {section.links.map((link, index) => (
                  <li key={index}>
                    <Link
                      href={link.href}
                      className="text-muted-foreground 
                      hover:text-foreground transition-colors"
                    >
                      {link.item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-8" />

        <div
          className="flex flex-col md:flex-row 
          justify-between items-center space-y-4 md:space-y-0"
        >
          <p className="text-sm text-muted-foreground">
            © {currentYear} Trajetto. Todos os direitos reservados.
          </p>
          <div
            className="flex space-x-4 text-sm 
            text-muted-foreground"
          >
            <Link
              href="/legal/privacy"
              className="hover:text-foreground transition-colors"
            >
              Política de Privacidade
            </Link>
            <span>•</span>
            <Link
              href="/legal/terms"
              className="hover:text-foreground transition-colors"
            >
              Termos de Serviço
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export { Footer };
