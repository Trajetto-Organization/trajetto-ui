"use client";

import { useRef, useState } from "react";
import Link from "next/link";

import Image from "next/image";

import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";

import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const FleetManagementDashboard = (): JSX.Element => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  // Motion values ​​to control rotation in X and Y
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Turn mouse movement into rotation with limits
  const rotateX = useTransform(mouseY, [-300, 300], [5, -5]);
  const rotateY = useTransform(mouseX, [-300, 300], [-5, 5]);

  // Add spring to smooth out the movement
  const springConfig = { damping: 15, stiffness: 150 };

  const springRotateX = useSpring(rotateX, springConfig);
  const springRotateY = useSpring(rotateY, springConfig);

  // Values ​​for the glow effect
  const glareX = useTransform(mouseX, [-300, 300], ["10%", "90%"]);
  const glareY = useTransform(mouseY, [-300, 300], ["10%", "90%"]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Calculate distance from center of element
    mouseX.set(e.clientX - centerX);
    mouseY.set(e.clientY - centerY);
  };

  return (
    <section className="py-24 relative overflow-hidden" ref={containerRef}>
      <div
        className="absolute inset-0 bg-gradient-to-b 
        from-background via-background/90 to-background z-0"
      />

      {/* Gradient mesh background - gives depth */}
      <div className="absolute inset-0 overflow-hidden opacity-30 z-0">
        <div
          className="absolute w-full h-full 
          bg-[radial-gradient(circle_at_50%_120%,#d81b60_0%,transparent_50%)]"
        />
        <div
          className="absolute w-full h-full 
          bg-[radial-gradient(circle_at_80%_20%,#2196f3_0%,transparent_50%)]"
        />
        <div
          className="absolute w-full h-full 
          bg-[radial-gradient(circle_at_20%_80%,#4caf50_0%,transparent_40%)]"
        />
      </div>

      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center space-y-6 mb-16 max-w-3xl mx-auto"
        >
          <h2
            className="text-3xl font-bold tracking-tight inline-block 
            sm:text-5xl bg-clip-text text-transparent bg-gradient-to-r
            from-[#d81b60] via-foreground to-[#2196f3] pb-2 leading-relaxed"
          >
            Monitore a gestão da sua frota
          </h2>
          <p className="text-xl text-muted-foreground">
            Experimente o poder da visualização das suas frotas. Monitore seus
            veículos, e tome decisões baseadas em dados.
          </p>
        </motion.div>

        {/* Interactive 3D Box */}
        <motion.div
          className="relative mx-auto max-w-5xl h-[400px] 
          md:h-[500px] rounded-2xl overflow-hidden shadow-2xl border 
          border-white/20 bg-background/80 backdrop-blur-sm"
          initial={{ scale: 0.9, opacity: 0.8, rotateX: 2 }}
          animate={{
            scale: 1,
            opacity: 1,
            rotateX: 0,
            boxShadow: hovered
              ? "0 20px 80px -10px rgba(216, 27, 96, 0.3), 0 30px 60px -30px rgba(33, 150, 243, 0.4)"
              : "0 10px 30px -5px rgba(0, 0, 0, 0.3)",
          }}
          transition={{ duration: 1.2 }}
          style={{
            transformPerspective: "1200px",
            rotateX: springRotateX,
            rotateY: springRotateY,
            transformStyle: "preserve-3d",
          }}
          whileHover={{ scale: 1.02 }}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => {
            setHovered(false);

            mouseX.set(0);
            mouseY.set(0);
          }}
        >
          {/* Dashboard image */}
          <div className="relative w-full h-full">
            <Image
              src="/trajetto-management-dashboard.png"
              alt="Dashboard de Gerenciamento de Frota"
              layout="fill"
              objectFit="cover"
              className="z-10"
              priority
            />

            {/* Glare effect */}
            <motion.div
              className="absolute inset-0 z-20 bg-gradient-radial 
              from-white/20 to-transparent opacity-0"
              style={{
                opacity: hovered ? 0.7 : 0,
                backgroundSize: "600px 600px",
                backgroundPosition: `${glareX}px ${glareY}px`,
              }}
            />
          </div>
        </motion.div>

        {/* Call to action */}
        <motion.div
          className="text-center mt-12 space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Imagine ter todas essas informações para sua frota em tempo real,
            permitindo decisões inteligentes e economizando recursos valiosos.
          </p>
          <Link
            href={"/quote"}
            className={cn(
              buttonVariants({ size: "lg" }),
              `rounded-full bg-gradient-to-r from-[#d81b60] 
            to-[#d81b60]/80 hover:from-[#d81b60]/90 hover:to-[#d81b60]/70 
            text-white shadow-lg group`,
            )}
          >
            Solicitar Orçamento
            <div className="ml-2">
              <ArrowRight
                size={20}
                className="group-hover:translate-x-1 
                transition-all duration-300"
              />
            </div>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export { FleetManagementDashboard };
