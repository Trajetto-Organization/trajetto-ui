"use client";

import { motion } from "framer-motion";

const BlogTitleSubtitle = () => {
  return (
    <div
      className="text-center max-w-3xl 
      mx-auto py-16 sm:py-20"
    >
      <motion.h2
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-4xl md:text-5xl 
        font-bold tracking-tight mb-4"
      >
        Trajetto Blog
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, x: -30 }}
        whileInView={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4, type: "tween" }}
        className="mt-4 text-xl 
        text-muted-foreground max-w-2xl mx-auto"
      >
        Descubra como reduzir custos, aumentar eficiência e transformar sua
        operação logística.
      </motion.p>
    </div>
  );
};

export { BlogTitleSubtitle };
