"use client";

import {
  ForwardRefExoticComponent,
  RefAttributes,
  useEffect,
  useRef,
  useState,
} from "react";
import { useInView, motion, animate } from "framer-motion";

import { Building, Globe, LucideProps, TrendingUp, Truck } from "lucide-react";

interface StatCardProps {
  stat: {
    value: number;
    suffix: string;
    label: string;
    icon: ForwardRefExoticComponent<
      Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>
    >;
    color1: string;
    color2: string;
    description: string;
  };
  isInView: boolean;
}

const AboutStatsSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  // More detailed stats with colors and descriptions
  const stats = [
    {
      value: 500,
      suffix: "+",
      label: "Clientes",
      icon: Building,
      color1: "#0ea5e9", // Sky blue
      color2: "#2563eb", // Blue
      description: "Empresas que confiam na Trajetto",
    },
    {
      value: 30,
      suffix: "K+",
      label: "Veículos Gerenciados",
      icon: Truck,
      color1: "#16a34a", // Green
      color2: "#059669", // Emerald
      description: "Monitorados em tempo real",
    },
    {
      value: 15,
      suffix: "M+",
      label: "Km Otimizados Mensalmente",
      icon: TrendingUp,
      color1: "#d81b60", // Pink
      color2: "#9d174d", // Rose
      description: "Economizando combustível e tempo",
    },
    {
      value: 99,
      suffix: "%",
      label: "Satisfação dos Clientes",
      icon: Globe,
      color1: "#8b5cf6", // Purple
      color2: "#6d28d9", // Violet
      description: "Clientes recomendam nossa solução",
    },
  ];

  return (
    <section
      ref={ref}
      className="py-20 relative overflow-hidden"
      style={{
        backgroundColor: "#f8fafc",
        backgroundImage: "radial-gradient(#d81b6015 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
    >
      <div
        className="absolute top-20 left-20 w-40 h-40 
        rounded-full bg-[#d81b60]/10 filter blur-3xl"
      />
      <div
        className="absolute bottom-20 right-20 w-60 
        h-60 rounded-full bg-[#0ea5e9]/10 filter blur-3xl"
      />

      <div className="container relative z-10 px-4 md:px-6">
        <div className="text-center mb-16">
          <motion.h2
            className="text-3xl md:text-4xl font-bold mb-4 text-gray-900"
            style={{
              transform: isInView ? "none" : "translateY(20px)",
              opacity: isInView ? 1 : 0,
              transition: "all 0.8s cubic-bezier(0.17, 0.55, 0.55, 1)",
            }}
          >
            Trajetto em Números
          </motion.h2>
          <motion.p
            className="text-xl text-muted-foreground max-w-2xl mx-auto"
            style={{
              transform: isInView ? "none" : "translateY(20px)",
              opacity: isInView ? 1 : 0,
              transition: "all 0.8s cubic-bezier(0.17, 0.55, 0.55, 1) 0.2s",
            }}
          >
            O impacto positivo da nossa solução em empresas de todos os
            segmentos
          </motion.p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              style={{
                transform: isInView ? "none" : "translateY(50px)",
                opacity: isInView ? 1 : 0,
                transition: `all 0.7s cubic-bezier(0.17, 0.55, 0.55, 1) ${0.2 + index * 0.15}s`,
              }}
            >
              <StatCard stat={stat} isInView={isInView} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const StatCard = ({ stat, isInView }: StatCardProps) => {
  const [count, setCount] = useState<number>(0);

  // Animate the counter when in view
  useEffect(() => {
    if (isInView) {
      const duration = 2;

      const controls = animate(0, stat.value, {
        duration: duration,
        onUpdate: (value) => {
          setCount(Math.floor(value));
        },
        ease: "easeOut",
      });

      return () => controls.stop();
    }
  }, [isInView, stat.value]);

  return (
    <div className="relative group">
      {/* Main card with gradient background */}
      <div
        className="h-full p-6 rounded-2xl overflow-hidden 
        transition-all duration-300 shadow-md hover:shadow-xl"
        style={{
          background: `linear-gradient(135deg, ${stat.color1}80, ${stat.color2}90)`,
        }}
      >
        {/* Glowing accent in top-right */}
        <div
          className="absolute top-0 right-0 w-20 h-20 rounded-full 
          opacity-30 transition-all duration-500 group-hover:opacity-50 
          group-hover:scale-125"
          style={{
            background: `radial-gradient(circle, ${stat.color1}, transparent 70%)`,
            filter: "blur(15px)",
          }}
        />

        {/* Card content with icon */}
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            {/* Icon with pulsing effect */}
            <div
              className="w-12 h-12 rounded-xl flex 
              items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${stat.color1}30, ${stat.color2}30)`,
              }}
            >
              <motion.div
                animate={{
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "loop",
                }}
              >
                <stat.icon className="h-6 w-6 text-white" />
              </motion.div>
            </div>

            {/* Small decorative element */}
            <div className="flex space-x-1">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-1 h-1 
                  rounded-full bg-white/50"
                />
              ))}
            </div>
          </div>

          {/* Number and label */}
          <div className="mb-3">
            <div
              className="text-4xl md:text-5xl font-bold 
            text-white tracking-tight"
            >
              {count}
              {stat.suffix}
            </div>
            <div
              className="text-lg font-medium 
            text-white/90 mt-1"
            >
              {stat.label}
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-white/70">{stat.description}</p>

          {/* Bottom accent bar that grows on hover */}
          <div
            className="h-1 w-12 mt-3 transition-all 
            duration-500 group-hover:w-full rounded-full"
            style={{
              background: `linear-gradient(to right, ${stat.color1}, ${stat.color2})`,
              boxShadow: `0 0 10px ${stat.color1}50`,
            }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export { AboutStatsSection };
