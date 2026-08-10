"use client";

import { useRef } from "react";
import { useInView, motion } from "framer-motion";

import Image from "next/image";

// Imports estáticos: o Next gera o `blurDataURL` no build. O padrão anterior
// (`useState` + fade + skeleton cinza) dependia de JS no cliente e piscava.
import michaelPhoto from "@/../public/about/michael-about-co-founder.webp";
import gabrielPhoto from "@/../public/about/gabriel-about-co-founder.webp";

import thiagoPhoto from "@/../public/about/thiago-about-co-founder.webp";
import jomarPhoto from "@/../public/about/jomar-about-co-founder.webp";

const AboutTeamSection = (): JSX.Element => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  const team = [
    {
      name: "Michael Sivori",
      role: "CPO & Co-Fundador",
      bio: "Lidera design e experiência do usuário da plataforma com foco em interface e front-end.",
      image: michaelPhoto,
    },
    {
      name: "Gabriel Mesquita",
      role: "CTO & Co-Fundador",
      bio: "Arquiteto técnico da plataforma. Especialista em desenvolvimento full-stack.",
      image: gabrielPhoto,
    },
    {
      name: "Thiago Baptista",
      role: "Head de Infraestrutura & Co-Fundador",
      bio: "Especialista em automação, IA e arquitetura de sistemas. CEO da THS Tecnologia.",
      image: thiagoPhoto,
    },
    {
      name: "Jomar Pereira",
      role: "Head Comercial & Co-Fundador",
      bio: "Lidera estratégias de vendas e relacionamento com clientes no mercado B2B de gestão de frotas.",
      image: jomarPhoto,
    },
  ];

  return (
    <section className="py-20 bg-background" ref={ref}>
      <div className="container px-4 md:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Nossa Equipe</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Conheça os especialistas por trás do Trajetto
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
                {/* Optimized team member image */}
                <Image
                  src={member.image}
                  alt={`${member.name} - ${member.role}`}
                  fill
                  className="object-cover"
                  quality={85}
                  placeholder="blur"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />

                {/* Gradient overlay */}
                <div
                  className="absolute inset-0 bg-gradient-to-t
                from-black/70 via-black/20 to-transparent z-10"
                />

                {/* Member info overlay */}
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
