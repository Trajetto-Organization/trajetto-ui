import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Button } from "@/components/ui/button";
import { Smartphone } from "lucide-react";

import { useSidebar } from "@/components/ui/sidebar";

const ProtectedGetAppButton = (): JSX.Element => {
  const { open } = useSidebar();

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild className="w-full">
          <Button
            variant="secondary"
            className={`border flex items-center ${
              open ? "justify-start" : "justify-center h-8"
            }`}
          >
            <Smartphone />

            {open && (
              <span className="ml-2 truncate text-sm font-medium">
                Obter Aplicativo
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {/* No QR code until the app is published: a code that leads
              nowhere frustrates more than it helps. */}
          <div className="flex flex-col items-center w-44 py-1">
            <span
              className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px]
              font-semibold uppercase tracking-wider text-primary"
            >
              Em breve
            </span>
            <p className="mt-2 text-xs text-center text-muted-foreground">
              O aplicativo Android está em fase final de testes. Avisaremos por
              aqui assim que a publicação sair.
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export { ProtectedGetAppButton };
