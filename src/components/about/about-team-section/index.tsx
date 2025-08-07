"use client";

import { useRef } from "react";

import { useInView, motion } from "framer-motion";
import { Users } from "lucide-react";

const AboutTeamSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  const team = [
    {
      name: "Ana Silva",
      role: "CEO & Fundadora",
      bio: "Mais de 15 anos de experiência em logística e tecnologia.",
      image: "/team-1.jpg",
    },
    {
      name: "Ricardo Mendes",
      role: "CTO",
      bio: "Especialista em IA e sistemas para otimização de frotas.",
      image: "/team-2.jpg",
    },
    {
      name: "Juliana Costa",
      role: "Diretora de Operações",
      bio: "Implementou soluções de gestão para mais de 100 empresas.",
      image: "/team-3.jpg",
    },
    {
      name: "Marcos Oliveira",
      role: "Diretor Comercial",
      bio: "Expertise em expandir negócios B2B no setor de tecnologia.",
      image: "/team-4.jpg",
    },
  ];

  return (
    <section className="py-20 bg-background" ref={ref}>
      <div className="container px-4 md:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Nossa Equipe</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Conheça os especialistas por trás da Trajetto
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {team.map((member, index) => (
            <motion.div
              key={index}
              className="relative group"
              style={{
                transform: isInView ? "none" : "translateY(50px)",
                opacity: isInView ? 1 : 0,
                transition: `all 0.7s cubic-bezier(0.17, 0.55, 0.55, 1) ${0.2 + index * 0.1}s`,
              }}
            >
              <div className="relative h-80 overflow-hidden rounded-lg mb-4">
                <div
                  className="absolute inset-0 bg-gradient-to-t 
                from-black/70 via-black/20 to-transparent z-10"
                ></div>
                <div
                  className="relative w-full h-full 
                  bg-muted rounded-lg overflow-hidden"
                >
                  {/* Placeholder for the team member image */}
                  <div
                    className="absolute inset-0 bg-gradient-to-br 
                      from-[#d81b60]/30 to-[#880e4f]/30"
                  ></div>
                  <div
                    className="w-full h-full flex items-center 
                      justify-center text-white/20"
                  >
                    <Users className="w-20 h-20" />
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
                  <h3 className="text-xl font-bold text-white mb-1">
                    {member.name}
                  </h3>
                  <p className="text-white/80 text-sm">{member.role}</p>
                </div>
              </div>
              <p className="text-muted-foreground text-sm">{member.bio}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export { AboutTeamSection };
