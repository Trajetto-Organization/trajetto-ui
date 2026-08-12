"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";

import { Search, Filter, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface BlogSearchProps {
  categories: {
    title: string;
    slug: string;
    color: string;
    count?: number;
  }[];
  totalPosts: number;
}

const BlogSearch = ({
  categories,
  totalPosts,
}: BlogSearchProps): JSX.Element => {
  const router = useRouter();

  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get("category") || "",
  );

  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const prevSearchQuery = useRef(searchQuery);
  const prevSelectedCategory = useRef(selectedCategory);

  // Sync state with URL params when they change externally
  useEffect(() => {
    const currentQuery = searchParams.get("q") || "";
    const currentCategory = searchParams.get("category") || "";

    if (currentQuery !== searchQuery) {
      setSearchQuery(currentQuery);
    }

    if (currentCategory !== selectedCategory) {
      setSelectedCategory(currentCategory);
    }
  }, [searchParams]);

  useEffect(() => {
    const searchChanged = searchQuery !== prevSearchQuery.current;
    const categoryChanged = selectedCategory !== prevSelectedCategory.current;

    if (!searchChanged && !categoryChanged) {
      return;
    }

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());

      if (searchQuery) {
        params.set("q", searchQuery);
      } else {
        params.delete("q");
      }

      if (selectedCategory) {
        params.set("category", selectedCategory);
      } else {
        params.delete("category");
      }

      if (searchChanged || categoryChanged) {
        params.delete("page");
      }

      const currentUrl = `${pathname}?${params.toString()}`;
      const newUrl = params.toString() ? currentUrl : pathname;

      if (window.location.pathname + window.location.search !== newUrl) {
        router.push(newUrl);
      }

      prevSearchQuery.current = searchQuery;
      prevSelectedCategory.current = selectedCategory;
    }, 300); // Debounce delay

    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory, searchParams, pathname, router]);

  const handleCategorySelect = (category: string) => {
    const newCategory = category === selectedCategory ? "" : category;
    setSelectedCategory(newCategory);

    const params = new URLSearchParams(searchParams.toString());

    if (searchQuery) {
      params.set("q", searchQuery);
    }

    if (newCategory) {
      params.set("category", newCategory);
    } else {
      params.delete("category");
    }

    params.delete("page");

    const newUrl = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname;

    router.push(newUrl);
    prevSelectedCategory.current = newCategory;
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSelectedCategory("");

    router.push(pathname);

    prevSearchQuery.current = "";
    prevSelectedCategory.current = "";
  };

  const activeFiltersCount = (searchQuery ? 1 : 0) + (selectedCategory ? 1 : 0);

  return (
    <div className="w-full space-y-6">
      {/* Search Bar */}
      <div className="animate-fade-up relative">
        <div className="relative group">
          <div
            className="absolute inset-0 bg-gradient-to-r 
            from-purple-500/20 via-pink-500/20 to-blue-500/20 
            rounded-2xl blur-xl opacity-0 group-hover:opacity-100 
            transition-opacity duration-500"
          />

          <div
            className="relative flex items-center gap-3 p-2 
            bg-background/50 backdrop-blur-sm border 
            rounded-2xl shadow-lg"
          >
            <div className="relative flex-1 overflow-hidden rounded-xl">
              <Search
                className={cn(
                  "absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors z-10",
                  searchQuery ? "text-primary" : "text-muted-foreground",
                )}
              />
              <Input
                type="text"
                placeholder="Pesquisar posts incríveis..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearching(true);
                  setTimeout(() => setIsSearching(false), 500);
                }}
                className="pl-12 pr-4 h-12 bg-transparent border-0 
                focus-visible:ring-0 text-base placeholder:text-muted-foreground/70"
              />

              {/* Animated search indicator with gradient blur edges */}
              <div
                hidden={!isSearching}
                className="toggle toggle-scale-x
                absolute bottom-0 left-0 right-0 h-1"
              >
                {/* Glowing effect */}
                <div
                  className="absolute inset-0 bg-gradient-to-r from-purple-500 
                      via-pink-500 to-blue-500 blur-sm opacity-60"
                />

                {/* Main gradient bar with soft edges */}
                <div
                  className="absolute inset-0 h-0.5 
                      top-1/2 -translate-y-1/2"
                  style={{
                    background: `linear-gradient(90deg, 
                          transparent 0%, 
                          rgba(168, 85, 247, 0.3) 2%,
                          rgba(168, 85, 247, 0.8) 10%,
                          #a855f7 20%,
                          #ec4899 50%,
                          #3b82f6 80%,
                          rgba(59, 130, 246, 0.8) 90%,
                          rgba(59, 130, 246, 0.3) 98%,
                          transparent 100%
                        )`,
                  }}
                />

                {/* Animated shimmer effect */}
                <div
                  className="animate-shimmer absolute inset-0 h-0.5
                      top-1/2 -translate-y-1/2"
                  style={{
                    background: `linear-gradient(90deg, 
                          transparent 0%, 
                          rgba(255, 255, 255, 0.3) 50%, 
                          transparent 100%
                        )`,
                    width: "30%",
                  }}
                />
              </div>
            </div>

            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "h-10 w-10 rounded-xl transition-all",
                  showFilters && "bg-primary text-primary-foreground",
                )}
              >
                <Filter className="h-5 w-5" />
              </Button>
              {activeFiltersCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 h-5 w-5 bg-primary 
                  text-primary-foreground text-xs rounded-full flex 
                  items-center justify-center font-semibold shadow-sm
                  border-2 border-background"
                >
                  {activeFiltersCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      {/* Kept mounted and collapsed with a grid row instead of being unmounted:
          `height: auto` cannot be animated, which is why framer had to measure
          the panel in JavaScript. `0fr` to `1fr` needs no measuring. */}
      <div className="expand" data-open={showFilters}>
        <div>
          <div className="p-6 bg-muted/30 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Filtrar por Categoria
              </h3>
              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSearch}
                  className="text-muted-foreground 
                    hover:text-foreground"
                >
                  Limpar filtros
                </Button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {categories.map((category, index) => (
                <div
                  key={category.slug}
                  className="animate-scale-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <Badge
                    variant={
                      selectedCategory === category.slug ? "default" : "outline"
                    }
                    className={cn(
                      "cursor-pointer transition-all hover:scale-105 px-4 py-2",
                      selectedCategory === category.slug &&
                        "shadow-lg shadow-primary/20",
                    )}
                    style={{
                      backgroundColor:
                        selectedCategory === category.slug
                          ? category.color
                          : "transparent",
                      borderColor: category.color,
                      color:
                        selectedCategory === category.slug
                          ? "white"
                          : category.color,
                    }}
                    onClick={() => handleCategorySelect(category.slug)}
                  >
                    {category.title}
                    {category.count && (
                      <span className="ml-2 opacity-70">
                        ({category.count})
                      </span>
                    )}
                  </Badge>
                </div>
              ))}
            </div>

            <div
              className="pt-2 flex items-center 
                justify-between text-sm text-muted-foreground"
            >
              <span>
                {totalPosts}{" "}
                {totalPosts === 1 ? "post encontrado" : "posts encontrados"}
              </span>

              {(searchQuery || selectedCategory) && (
                <span className="flex items-center gap-2">
                  Filtrando por:
                  {searchQuery && (
                    <Badge
                      variant="secondary"
                      className="text-xs max-w-[150px]"
                    >
                      <span className="truncate">
                        &quot;{searchQuery}&quot;
                      </span>
                    </Badge>
                  )}
                  {selectedCategory && (
                    <Badge variant="secondary" className="text-xs">
                      {
                        categories.find((c) => c.slug === selectedCategory)
                          ?.title
                      }
                    </Badge>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { BlogSearch };
