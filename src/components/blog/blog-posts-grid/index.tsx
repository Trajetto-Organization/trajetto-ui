"use client";

import Link from "next/link";
import Image from "next/image";

import { motion } from "framer-motion";

import { BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ProcessedPost {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  featuredImage: {
    url: string;
    blurUrl: string;
  } | null;
  publishedAt: string;
  readTime: number | null;
  author: string;
  category: {
    title: string;
    slug: string;
    color: string;
  };
}

interface BlogPostsGridProps {
  posts: ProcessedPost[];
}

const BlogPostsGrid = ({ posts }: BlogPostsGridProps): JSX.Element => {
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
      className="grid md:grid-cols-3 gap-8 mb-16 mt-8"
    >
      {posts.map((post, index) => {
        const formattedDate = new Date(post.publishedAt).toLocaleDateString(
          "pt-BR",
          {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          },
        );

        const blurDataURL =
          post.featuredImage?.blurUrl || generateBlurDataURL();

        return (
          <motion.div key={post._id} variants={itemVariants}>
            <Link
              href={`/blog/${post.slug}`}
              className="group flex flex-col h-full"
            >
              <Card
                className="overflow-hidden hover:shadow-lg 
                transition-shadow duration-300 flex flex-col h-full p-0"
              >
                <div
                  className="aspect-video relative 
                  overflow-hidden bg-gray-100"
                >
                  {post.featuredImage?.url ? (
                    <Image
                      src={post.featuredImage.url}
                      alt={post.title}
                      fill
                      className="object-cover transform group-hover:scale-105 
                      transition-transform duration-300"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      priority={index < 3}
                      placeholder="blur"
                      blurDataURL={blurDataURL}
                      quality={85}
                    />
                  ) : (
                    <div
                      className="w-full h-full bg-gradient-to-br 
                      from-gray-100 to-gray-200 flex 
                      items-center justify-center"
                    >
                      <BookOpen className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-black/50 
                    to-transparent opacity-0 group-hover:opacity-100 
                    transition-opacity duration-300"
                  />
                </div>

                <CardContent
                  className="flex flex-col mt-4 
                  justify-between flex-1 pb-6"
                >
                  <div>
                    <div
                      className="flex items-center gap-2 text-sm mb-3"
                      style={{ color: post.category.color }}
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>{post.category.title}</span>
                    </div>

                    <h2
                      className="text-xl font-semibold mb-3 
                      group-hover:text-[#7c3aed] transition-colors 
                      duration-300 line-clamp-2"
                    >
                      {post.title}
                    </h2>

                    <p
                      className="text-gray-600 dark:text-gray-400 
                      text-sm line-clamp-3 mb-4 leading-relaxed"
                    >
                      {post.excerpt}
                    </p>
                  </div>

                  <div
                    className="flex items-center justify-between 
                    text-sm text-gray-500 dark:text-gray-300"
                  >
                    <span className="truncate mr-2">{post.author}</span>
                    <span className="flex-shrink-0">
                      {post.readTime
                        ? `${post.readTime} min de leitura`
                        : formattedDate}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        );
      })}
    </motion.div>
  );
};

// Helper function
const generateBlurDataURL = (width: number = 8, height: number = 6) => {
  const canvas = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#f3f4f6"/>
      <rect x="1" y="1" width="${width - 2}" height="${height - 2}" fill="#e5e7eb"/>
    </svg>
  `;

  return `data:image/svg+xml;base64,${Buffer.from(canvas).toString("base64")}`;
};

export { BlogPostsGrid };
export type { BlogPostsGridProps, ProcessedPost };
