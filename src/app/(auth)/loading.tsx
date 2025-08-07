"use client";

import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

const Loading = (): JSX.Element => {
  return (
    <>
      <div className="mb-7 grid gap-2 text-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Skeleton className="h-9 w-48 mx-auto mb-2" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, type: "tween" }}
        >
          <Skeleton className="h-5 w-64 mx-auto" />
        </motion.div>
      </div>

      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <div className="space-y-4">
          <div className="grid gap-3 relative">
            <Skeleton className="h-4 w-12" />
            <div className="relative">
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          </div>

          <div className="grid gap-3 relative">
            <Skeleton className="h-4 w-12" />
            <div className="relative">
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          </div>
        </div>

        <div className="mt-1">
          <Skeleton className="h-4 w-32" />
        </div>

        <div className="mt-6">
          <Skeleton className="h-10 w-full rounded-md" />
        </div>

        <div className="mt-7">
          <Skeleton className="h-px w-full" />
        </div>

        <div className="text-sm text-center p-5">
          <Skeleton className="h-3 w-full mx-auto mt-2" />
          <div className="flex justify-center gap-1 mt-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </motion.section>
    </>
  );
};

export default Loading;
