import { useRouter, useSearchParams } from "next/navigation";

function useSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const search = event.target.value;
    const params = new URLSearchParams(searchParams.toString());

    if (search) {
      params.set("search", search);
      params.set("page", "1");
    } else {
      params.delete("search");
    }

    router.push(`?${params.toString()}`, { scroll: false });
  };

  return {
    handleSearch,
    searchParams,
  };
}

export { useSearch };
