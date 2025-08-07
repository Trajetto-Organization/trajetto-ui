"use client";

import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

import { usePathname } from "next/navigation";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useTutorial } from "../tutorial-provider";
import { useSidebar } from "@/components/ui/sidebar";

import { tutorialConfigs } from "../tutorial-provider/data";

const TutorialButton = (): JSX.Element => {
  const { resetTutorial } = useTutorial();

  const handleClick = () => {
    // Reset and start tutorial
    resetTutorial();
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild className="hidden md:flex">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleClick}
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Iniciar Tutorial</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Alternative version for dropdown menu
const TutorialMenuItem = (): JSX.Element => {
  const { resetTutorial } = useTutorial();
  const { open } = useSidebar();

  const pathname = usePathname();
  const hasTutorial = !!tutorialConfigs[pathname];

  const getButtonText = () => {
    if (!hasTutorial) {
      return "Sem tutorial";
    }
    return "Ver Tutorial";
  };

  const getTooltipText = () => {
    if (!hasTutorial) {
      return "Página feita para ser direta, sem tutorial";
    }
    return "Ver Tutorial";
  };

  const handleClick = () => {
    if (hasTutorial) {
      resetTutorial();
    }
  };

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild className="w-full h-8" data-tutorial="help">
          <Button
            onClick={handleClick}
            variant="ghost"
            className={`flex items-center ${
              open ? "justify-start" : "justify-center h-8"
            } ${
              !hasTutorial
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <HelpCircle className={!hasTutorial ? "opacity-50" : ""} />
            {open && (
              <span
                className={`ml-2 truncate ${!hasTutorial ? "opacity-50" : ""}`}
              >
                {getButtonText()}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p
            className="text-xs text-center 
            text-muted-foreground max-w-48"
          >
            {getTooltipText()}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export { TutorialMenuItem, TutorialButton };
