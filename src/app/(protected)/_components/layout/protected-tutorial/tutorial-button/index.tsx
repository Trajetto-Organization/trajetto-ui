"use client";

import { HelpCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSidebar } from "@/components/ui/sidebar";

import { useTutorial } from "../tutorial-provider";

/**
 * "Ver Tutorial" in the sidebar footer: (re)opens the tour of the screen on
 * display. It asks the provider whether there is one — the provider resolves
 * the key the same way for the menu, the "?" shortcut and the auto-start, so
 * the three can no longer disagree about which tour a tab has.
 */
const TutorialMenuItem = (): JSX.Element => {
  const { hasTour, toursReady, startTutorial } = useTutorial();
  const { open, isMobile, setOpenMobile } = useSidebar();

  // On a phone the menu is a drawer over the page; the tour needs the page.
  const handleClick = () => {
    // Still loading: the provider opens the tour once its copy arrives.
    if (!hasTour && toursReady) return;

    if (isMobile) setOpenMobile(false);

    startTutorial();
  };

  const showLabel = open || isMobile;

  // While the tours load (a moment after the page is up) the item keeps its
  // usual label instead of flashing "Sem tutorial".
  const label = hasTour || !toursReady ? "Ver Tutorial" : "Sem tutorial";

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild className="h-8 w-full" data-tutorial="help">
          <Button
            onClick={handleClick}
            variant="ghost"
            className={`flex items-center ${showLabel ? "justify-start" : "h-8 justify-center"} ${
              !hasTour && toursReady
                ? "cursor-not-allowed text-muted-foreground"
                : "hover:bg-accent hover:text-accent-foreground"
            }`}
            /**
             * `aria-disabled` rather than `disabled`: a disabled button is not
             * focusable, and the tooltip that explains why there is no tour
             * would be unreachable by keyboard.
             */
            aria-disabled={!hasTour && toursReady}
          >
            <HelpCircle aria-hidden="true" />
            {showLabel && <span className="ml-2 truncate">{label}</span>}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-48 text-center text-xs text-muted-foreground">
            {hasTour || !toursReady
              ? "Ver Tutorial"
              : "Esta tela não tem tutorial"}
          </p>
          {hasTour && (
            <p className="mt-1 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
              Atalho:
              <kbd className="inline-flex h-4 min-w-4 items-center justify-center rounded border bg-muted px-1 font-mono text-[10px] font-medium">
                ?
              </kbd>
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export { TutorialMenuItem };
