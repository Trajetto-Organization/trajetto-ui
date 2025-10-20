import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, useRef, useCallback } from "react";

function useSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isPending, startTransition] = useTransition();
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const handleSearch = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const search = event.target.value;

      // Clears the previous timer
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      // Set new timer with 400ms debounce
      debounceTimer.current = setTimeout(() => {
        const params = new URLSearchParams(searchParams.toString());

        if (search) {
          params.set("search", search);
          params.set("page", "1");
        } else {
          params.delete("search");
        }

        startTransition(() => {
          router.push(`?${params.toString()}`, { scroll: false });
        });
      }, 400);
    },
    [router, searchParams],
  );

  return {
    handleSearch,
    searchParams,
    isPending,
  };
}

export { useSearch };
