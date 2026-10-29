import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

import { useCommandPalette } from "../protected-command-bar-provider/command-palette-context";

const SearchInput = (): JSX.Element => {
  // The palette's own context, not kbar's: kbar loads after the page.
  const { toggle } = useCommandPalette();

  // Spacing belongs to the header that places this button — it sits next to
  // the notifications bell now, so padding here would push them apart.
  return (
    <div className="flex items-center">
      <Button
        variant="outline"
        className="relative h-9 w-[87px] justify-start rounded-[0.5rem] bg-background 
        text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-64 lg:w-80"
        onClick={toggle}
        data-tutorial="search"
      >
        <div className="hidden md:flex items-center justify-center">
          <Search className="mr-1 h-4 w-4" />
          <span className="ml-2">Procurar...</span>
        </div>
        <kbd
          className="pointer-events-none absolute right-[0.3rem] 
          top-[0.3rem] h-6 select-none items-center gap-1 rounded border 
          bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 flex"
        >
          <span className="text-xs">⌘</span>ctrl + K
        </kbd>
      </Button>
    </div>
  );
};

export { SearchInput };
