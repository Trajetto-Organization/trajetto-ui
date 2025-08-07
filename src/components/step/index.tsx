"use client";

import { motion } from "framer-motion";

const Step = (): JSX.Element => {
  return (
    <motion.div
      initial={{ height: 0 }}
      whileInView={{ height: "100%" }}
      transition={{ delay: 0.4 }}
      className=" h-full w-[3px] mt-4 rounded-md 
      bg-gradient-to-b from-[#ffd6cc] via-[#f50057] 
      to-transparent"
    />
  );
};

export { Step };
