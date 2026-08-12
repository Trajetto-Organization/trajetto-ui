"use client";

import { Search, BookOpen, Filter, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface BlogEmptyStateProps {
  searchQuery?: string;
  category?: string;
}

const BlogEmptyState = ({
  searchQuery,
  category,
}: BlogEmptyStateProps): JSX.Element => {
  const router = useRouter();

  const clearFilters = () => {
    router.push("/blog");
  };

  return (
    <div className="flex flex-col items-center justify-center py-24 px-4">
      {/* Animated icon. The stagger that framer's `staggerChildren` produced is
          now an `animation-delay` per block, stepping 100ms at a time. */}
      <div className="animate-fade-up relative mb-8">
        <div
          className="absolute inset-0 bg-gradient-to-r
         from-purple-500/20 via-pink-500/20
         to-blue-500/20 blur-3xl"
        />
        <div className="animate-wiggle relative">
          {searchQuery || category ? (
            <Search className="w-24 h-24 text-muted-foreground/50" />
          ) : (
            <BookOpen className="w-24 h-24 text-muted-foreground/50" />
          )}
        </div>
      </div>

      {/* Title */}
      <h3
        className="animate-fade-up [animation-delay:100ms]
        text-2xl font-bold text-center mb-3"
      >
        {searchQuery || category
          ? "Nenhum resultado encontrado"
          : "Ainda não há posts publicados"}
      </h3>

      {/* Description */}
      <p
        className="animate-fade-up [animation-delay:200ms]
        text-muted-foreground text-center max-w-md mb-8"
      >
        {category && (
          <>
            Não há posts na categoria selecionada.
            <br />
          </>
        )}
        {!searchQuery && !category && (
          <>
            Estamos preparando conteúdo incrível para você.
            <br />
          </>
        )}
        <span className="text-sm">
          {searchQuery || category
            ? "Tente ajustar seus filtros ou explorar outros tópicos."
            : "Volte em breve para conferir as novidades!"}
        </span>
      </p>

      {/* Actions */}
      <div
        className="animate-fade-up [animation-delay:300ms]
        flex flex-col sm:flex-row gap-4"
      >
        {(searchQuery || category) && (
          <Button
            onClick={clearFilters}
            variant="default"
            className="rounded-full"
          >
            <Filter className="mr-2 h-4 w-4" />
            Limpar filtros
          </Button>
        )}
        <Button
          variant="outline"
          className="rounded-full"
          onClick={() => router.push("/")}
        >
          Voltar ao início
        </Button>
      </div>

      {/* Suggestions */}
      {(searchQuery || category) && (
        <div className="animate-fade-up [animation-delay:400ms] mt-12 text-center">
          <p
            className="text-sm text-muted-foreground 
            mb-4 flex items-center justify-center gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            Sugestões de pesquisa
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {["Gestão de Frotas", "Tecnologia"].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() =>
                  router.push(`/blog?q=${encodeURIComponent(suggestion)}`)
                }
                className="px-4 py-2 text-sm bg-muted hover:bg-muted/80
                rounded-full transition-all duration-200
                hover:scale-105 active:scale-95"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export { BlogEmptyState };
export type { BlogEmptyStateProps };
