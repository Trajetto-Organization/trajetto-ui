"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

import { cn } from "@/lib/utils";

const NavigateButton = (): JSX.Element | null => {
  const pathname = usePathname();
  const isLoginPage = pathname.endsWith("/login");

  return (
    <div className="absolute left-6 group">
      <Link
        aria-label={isLoginPage ? "Voltar para home" : "Entrar"}
        href={isLoginPage ? "/" : "/login"}
        className={cn(
          buttonVariants({ variant: "ghost", className: "rounded-full group" }),
        )}
      >
        {isLoginPage ? (
          <>
            <ArrowLeft
              size={20}
              className="group-hover:-translate-x-1 transition-all duration-300"
            />
            Voltar ao início
          </>
        ) : (
          <>
            Entrar
            <ArrowRight
              size={20}
              className="group-hover:translate-x-1 transition-all duration-300"
            />
          </>
        )}
      </Link>
    </div>
  );
};

export { NavigateButton };
