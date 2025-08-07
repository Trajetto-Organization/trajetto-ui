import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Button } from "@/components/ui/button";
import { Smartphone } from "lucide-react";

import { QRCodeSVG } from "qrcode.react";
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
          <div className="flex flex-col items-center w-40 py-1">
            <QRCodeSVG
              value="https://app.com/download"
              size={160}
              bgColor="#ffffff"
              fgColor="#000000"
              level="H"
            />
            <p className="mt-2 text-xs text-center text-muted-foreground">
              Escaneie para baixar o nosso app
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export { ProtectedGetAppButton };
