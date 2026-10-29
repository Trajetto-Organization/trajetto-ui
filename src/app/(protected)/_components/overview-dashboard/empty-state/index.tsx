"use client";

import { Compass, PanelsTopLeft, Search } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useCommandPalette } from "../../layout/protected-command-bar-provider/command-palette-context";

/**
 * What a collaborator sees when none of the dashboard shortcuts are theirs.
 *
 * The shortcut grid follows the access profile and the hired modules, so a
 * narrow profile — say, only permissions and access profiles — legitimately
 * matches no card. Rendering nothing left the screen looking broken instead
 * of looking restricted, which are very different messages.
 */
const OverviewEmptyState = (): JSX.Element => {
  const { toggle } = useCommandPalette();

  return (
    <div className="flex flex-col items-center justify-center px-4 py-20">
      <div
        className="animate-fade-up [animation-delay:100ms]
        relative mb-6 sm:mb-8"
      >
        <div
          className="absolute inset-0 bg-gradient-to-r
          from-blue-500/20 via-indigo-500/20
          to-purple-500/20 blur-xl sm:blur-2xl md:blur-3xl"
        />
        <div className="animate-wiggle relative">
          <PanelsTopLeft
            className="h-12 w-12 text-muted-foreground/50
            sm:h-16 sm:w-16 md:h-20 md:w-20 lg:h-24 lg:w-24"
          />
        </div>
      </div>

      <h3
        className="animate-fade-up [animation-delay:200ms]
        mb-2 px-2 text-center text-base font-bold
        sm:mb-3 sm:text-lg md:text-xl lg:text-2xl"
      >
        Nenhum atalho por aqui
      </h3>

      <p
        className="animate-fade-up [animation-delay:300ms]
        mb-6 max-w-xs px-2 text-center text-xs text-muted-foreground
        sm:mb-8 sm:max-w-sm sm:text-sm md:max-w-md md:text-base lg:max-w-lg"
      >
        Os atalhos desta tela seguem o seu perfil de acesso e os módulos
        contratados pela empresa — e nenhum deles corresponde ao seu perfil no
        momento.
        <span className="mt-2 block text-xs sm:text-sm">
          Use o menu lateral para chegar ao que você tem acesso, ou fale com o
          administrador da sua empresa se precisar de mais permissões.
        </span>
      </p>

      <div
        className="animate-fade-up [animation-delay:400ms]
        flex flex-col items-center gap-4 sm:flex-row"
      >
        <Button onClick={toggle} variant="default" className="rounded-full">
          <Search className="mr-2 h-4 w-4" />
          Buscar uma página
        </Button>

        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <Compass className="h-3.5 w-3.5" />
          ou pressione
          <kbd
            className="pointer-events-none flex h-6 select-none items-center
            gap-1 rounded border bg-muted px-1.5 font-mono text-[10px]
            font-medium"
          >
            <span className="text-xs">⌘</span>ctrl + K
          </kbd>
        </span>
      </div>
    </div>
  );
};

export { OverviewEmptyState };
