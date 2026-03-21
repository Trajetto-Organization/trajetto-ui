"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";

interface BlogPaginationProps {
  currentPage: number;
  totalPages: number;
  totalPosts: number;
  postsPerPage: number;
}

interface PageButtonProps {
  page: number;
  isActive: boolean;
  onClick: () => void;
}

const BlogPagination = ({
  currentPage,
  totalPages,
  totalPosts,
  postsPerPage,
}: BlogPaginationProps) => {
  const router = useRouter();
  const pathname = usePathname();

  const searchParams = useSearchParams();

  const navigateToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());

    if (page === 1) {
      params.delete("page");
    } else {
      params.set("page", page.toString());
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  if (totalPages <= 1) return null;

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisible = 7;

    const halfVisible = Math.floor(maxVisible / 2);

    let startPage = Math.max(1, currentPage - halfVisible);
    let endPage = Math.min(totalPages, currentPage + halfVisible);

    // Adjust if we're near the beginning or end
    if (currentPage <= halfVisible) {
      endPage = Math.min(totalPages, maxVisible);
    } else if (currentPage > totalPages - halfVisible) {
      startPage = Math.max(1, totalPages - maxVisible + 1);
    }

    // First page + ellipsis
    if (startPage > 1) {
      pages.push(
        <PageButton
          key={1}
          page={1}
          isActive={currentPage === 1}
          onClick={() => navigateToPage(1)}
        />,
      );
      if (startPage > 2) {
        pages.push(
          <span key="start-ellipsis" className="px-2 text-muted-foreground">
            <MoreHorizontal className="h-4 w-4" />
          </span>,
        );
      }
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <PageButton
          key={i}
          page={i}
          isActive={currentPage === i}
          onClick={() => navigateToPage(i)}
        />,
      );
    }

    // Ellipsis + last page
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(
          <span key="end-ellipsis" className="px-2 text-muted-foreground">
            <MoreHorizontal className="h-4 w-4" />
          </span>,
        );
      }
      pages.push(
        <PageButton
          key={totalPages}
          page={totalPages}
          isActive={currentPage === totalPages}
          onClick={() => navigateToPage(totalPages)}
        />,
      );
    }

    return pages;
  };

  const startPost = (currentPage - 1) * postsPerPage + 1;
  const endPost = Math.min(currentPage * postsPerPage, totalPosts);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="mt-16 space-y-4"
    >
      {/* Posts counter */}
      <div className="text-center text-sm text-muted-foreground">
        Mostrando {startPost} - {endPost} de {totalPosts} posts
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigateToPage(currentPage - 1)}
          disabled={currentPage === 1}
          className={cn(
            "h-9 w-9 rounded-xl transition-all",
            currentPage === 1 && "opacity-50 cursor-not-allowed",
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-1">{renderPageNumbers()}</div>

        <Button
          variant="outline"
          size="icon"
          onClick={() => navigateToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={cn(
            "h-9 w-9 rounded-xl transition-all",
            currentPage === totalPages && "opacity-50 cursor-not-allowed",
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Progress bar */}
      <div className="max-w-xs mx-auto">
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r 
            from-purple-500 via-pink-500 to-blue-500"
            initial={{ width: 0 }}
            animate={{ width: `${(currentPage / totalPages) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>
    </motion.div>
  );
};

const PageButton = ({
  page,
  isActive,
  onClick,
}: PageButtonProps): JSX.Element => {
  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "h-9 w-9 rounded-md font-medium transition-all",
        "hover:bg-muted hover:text-black",
        isActive
          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {page}
    </motion.button>
  );
};

export { BlogPagination };
export type { BlogPaginationProps };
