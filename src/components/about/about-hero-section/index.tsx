"use client";

import { motion } from "framer-motion";

const AboutHeroSection = () => {
  return (
    <section
      className="relative h-[60vh] min-h-[500px] 
      flex items-center justify-center overflow-hidden"
    >
      {/* Background image with overlay */}
      <div
        className="absolute inset-0 bg-gradient-to-r 
        from-[#880e4f]/80 to-[#d81b60]/80 z-10"
      />
      <div
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{
          backgroundImage: "url('/about.jpg')",
          backgroundAttachment: "fixed",
        }}
      />

      {/* Content */}
      <div
        className="container relative z-20 
        text-white text-center px-4"
      >
        <motion.h1
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-4xl md:text-6xl 
          font-bold mb-6"
        >
          Nossa Jornada
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, type: "tween" }}
          className="text-xl md:text-2xl max-w-3xl 
          mx-auto leading-relaxed"
        >
          Transformando a gestão de frotas com tecnologia e inovação
        </motion.p>
      </div>
    </section>
  );
};

export { AboutHeroSection };
