"use client";

import { useRef } from "react";
import { motion } from "framer-motion";

import { useInView } from "framer-motion";
import { TrendingUp, Award, Truck, Code } from "lucide-react";

const AboutTimelineSection = (): JSX.Element => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  const timelineItems = [
    {
      year: "2024",
      title: "Ideação e Planejamento",
      description:
        "Início do desenvolvimento da plataforma Trajetto com foco em resolver desafios reais da gestão de frotas.",
      color: "#0ea5e9", // Sky blue
      icon: Code,
      achievement: "Arquitetura moderna e escalável",
    },
    {
      year: "2025",
      title: "Lançamento Beta",
      description:
        "Versão beta disponibilizada para empresas parceiras com gestão completa de veículos e motoristas.",
      color: "#16a34a", // Green
      icon: Truck,
      achievement: "Primeiros clientes conquistados",
    },
    {
      year: "2025",
      title: "Versão Oficial",
      description:
        "Lançamento da plataforma completa com recursos avançados de controle, relatórios e automações.",
      color: "#8b5cf6", // Purple
      icon: Award,
      achievement: "Plataforma estável e em produção",
    },
    {
      year: "2026",
      title: "Evolução Contínua",
      description:
        "Expansão de recursos e melhorias constantes baseadas no feedback de nossos clientes.",
      color: "#ea580c", // Orange
      icon: TrendingUp,
      achievement: "Compromisso com inovação e excelência",
    },
  ];

  return (
    <section className="py-20 bg-muted/30" id="timeline" ref={ref}>
      <div className="container px-4 md:px-6">
        <div className="text-center mb-16">
          <h2
            className="text-3xl
            md:text-4xl font-bold mb-4"
          >
            Nossa Jornada
          </h2>
          <p
            className="text-xl
            text-muted-foreground
            max-w-2xl mx-auto"
          >
            Do papel à plataforma: construindo a gestão de frotas do futuro
          </p>
        </div>

        <div className="relative mx-auto max-w-4xl">
          <div className="block md:hidden">
            <div
              className="absolute left-6 top-0 bottom-0 w-0.5 
              bg-gradient-to-b from-[#0ea5e9]/40 
              via-[#d81b60]/40 to-[#ea580c]/40 rounded"
            />

            {timelineItems.map((item, index) => (
              <motion.div
                key={index}
                className="relative mb-12 pl-16"
                style={{
                  transform: isInView ? "none" : "translateY(30px)",
                  opacity: isInView ? 1 : 0,
                  transition: `all 0.7s cubic-bezier(0.17, 0.55, 0.55, 1) ${
                    0.2 + index * 0.1
                  }s`,
                }}
              >
                {/* Year bubble for mobile */}
                <div
                  className="absolute left-3 top-2 w-6 h-6 rounded-full 
                  flex items-center justify-center text-white 
                  text-xs font-medium z-10"
                  style={{ backgroundColor: item.color }}
                >
                  {item.year.slice(-2)}
                </div>

                {/* Content card for mobile */}
                <div
                  className="bg-card rounded-xl p-4 shadow-md border 
                  border-muted/10 group hover:shadow-lg 
                  transition-all duration-300"
                >
                  {/* Header with icon and full year */}
                  <div
                    className="flex items-center 
                    justify-between mb-3"
                  >
                    <div className="flex items-center">
                      <div
                        className="w-8 h-8 rounded-lg flex 
                        items-center justify-center mr-3"
                        style={{ backgroundColor: `${item.color}20` }}
                      >
                        <item.icon
                          className="h-4 w-4"
                          style={{ color: item.color }}
                        />
                      </div>
                      <h3 className="text-lg font-bold">{item.title}</h3>
                    </div>
                    <span
                      className="text-sm font-semibold px-2 py-1 rounded"
                      style={{
                        backgroundColor: `${item.color}15`,
                        color: item.color,
                      }}
                    >
                      {item.year}
                    </span>
                  </div>

                  <p className="text-muted-foreground text-sm mb-3">
                    {item.description}
                  </p>

                  {/* Achievement badge */}
                  <div
                    className="inline-block px-2 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: `${item.color}15`,
                      color: item.color,
                    }}
                  >
                    ★ {item.achievement}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* DESKTOP LAYOUT - Alternating horizontal timeline */}
          <div className="hidden md:block">
            {/* Center line for desktop */}
            <div
              className="absolute left-1/2 transform -translate-x-1/2 
              h-full w-0.5 bg-gradient-to-b from-[#0ea5e9]/40 
              via-[#d81b60]/40 to-[#ea580c]/40 rounded"
            />

            {timelineItems.map((item, index) => (
              <motion.div
                key={index}
                className={`relative mb-20 ${
                  index % 2 === 0 ? "pr-16 ml-auto" : "pl-16"
                } w-1/2`}
                style={{
                  transform: isInView
                    ? "none"
                    : `translateX(${index % 2 === 0 ? "50px" : "-50px"})`,
                  opacity: isInView ? 1 : 0,
                  transition: `all 0.7s cubic-bezier(0.17, 0.55, 0.55, 1) ${
                    0.2 + index * 0.1
                  }s`,
                }}
              >
                {/* Year Bubble for Desktop - Positioned Like the Original */}
                <div
                  className={`absolute ${
                    index % 2 === 0
                      ? "-right-6 md:right-7"
                      : "-left-6 md:left-7"
                  } top-4 flex items-center justify-center w-12 h-12 
                  rounded-full text-white font-medium text-sm shadow-lg z-10`}
                  style={{ backgroundColor: item.color }}
                >
                  {item.year}
                </div>

                {/* Content card for desktop */}
                <div
                  className="bg-card rounded-xl p-6 shadow-md border 
                  border-muted/10 group hover:shadow-lg 
                  transition-all duration-300"
                >
                  {/* Icon with animation */}
                  <div className="flex items-center mb-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center 
                      justify-center mr-3 transition-all duration-300 
                      group-hover:scale-110"
                      style={{ backgroundColor: `${item.color}20` }}
                    >
                      <item.icon
                        className="h-5 w-5"
                        style={{ color: item.color }}
                      />
                    </div>
                    <h3 className="text-xl font-bold">{item.title}</h3>
                  </div>

                  <p className="text-muted-foreground mb-3">
                    {item.description}
                  </p>

                  {/* Achievement badge */}
                  <div
                    className="inline-block px-3 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: `${item.color}15`,
                      color: item.color,
                    }}
                  >
                    ★ {item.achievement}
                  </div>
                </div>

                {/* Connector dot for desktop */}
                <div
                  className={`absolute ${
                    index % 2 === 0
                      ? "left-0 -translate-x-1/2"
                      : "right-0 translate-x-1/2"
                  } top-1/4 w-3 h-3 rounded-full z-10`}
                  style={{
                    backgroundColor: item.color,
                    boxShadow: `0 0 0 4px white`,
                  }}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export { AboutTimelineSection };
