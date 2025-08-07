"use client";

import { motion } from "framer-motion";
import { Search, BookOpen, Filter, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface BlogEmptyStateProps {
  searchQuery?: string;
  category?: string;
}

const BlogEmptyState = ({ searchQuery, category }: BlogEmptyStateProps) => {
  const router = useRouter();

  const clearFilters = () => {
    router.push("/blog");
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center justify-center py-24 px-4"
    >
      {/* Animated icon */}
      <motion.div variants={itemVariants} className="relative mb-8">
        <div
          className="absolute inset-0 bg-gradient-to-r 
         from-purple-500/20 via-pink-500/20 
         to-blue-500/20 blur-3xl"
        />
        <motion.div
          animate={{
            rotate: [0, -10, 10, -5, 5, 0],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            repeatType: "reverse",
          }}
          className="relative"
        >
          {searchQuery || category ? (
            <Search className="w-24 h-24 text-muted-foreground/50" />
          ) : (
            <BookOpen className="w-24 h-24 text-muted-foreground/50" />
          )}
        </motion.div>
      </motion.div>

      {/* Title */}
      <motion.h3
        variants={itemVariants}
        className="text-2xl font-bold text-center mb-3"
      >
        {searchQuery || category
          ? "Nenhum resultado encontrado"
          : "Ainda não há posts publicados"}
      </motion.h3>

      {/* Description */}
      <motion.p
        variants={itemVariants}
        className="text-muted-foreground text-center max-w-md mb-8"
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
      </motion.p>

      {/* Actions */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row gap-4"
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
      </motion.div>

      {/* Suggestions */}
      {(searchQuery || category) && (
        <motion.div variants={itemVariants} className="mt-12 text-center">
          <p
            className="text-sm text-muted-foreground 
            mb-4 flex items-center justify-center gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            Sugestões de pesquisa
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {["Gestão de Frotas", "Tecnologia"].map((suggestion) => (
              <motion.button
                key={suggestion}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() =>
                  router.push(`/blog?q=${encodeURIComponent(suggestion)}`)
                }
                className="px-4 py-2 text-sm bg-muted hover:bg-muted/80 
                rounded-full transition-colors"
              >
                {suggestion}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export { BlogEmptyState };
export type { BlogEmptyStateProps };
