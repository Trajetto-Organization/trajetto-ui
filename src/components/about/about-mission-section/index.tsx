"use client";

import Link from "next/link";

import { Reveal } from "@/components/shared/reveal";
import {
  BarChart,
  CheckCircle,
  Clock,
  Shield,
  TrendingUp,
  Truck,
  Users,
} from "lucide-react";

const AboutMissionSection = (): JSX.Element => {
  const missionData = [
    {
      title: "Inovação",
      description: "Investimos constantemente em novas tecnologias",
      Icon: CheckCircle,
    },
    {
      title: "Confiabilidade",
      description: "Sistemas robustos com uptime de 99.9%",
      Icon: Shield,
    },
    {
      title: "Colaboração",
      description: "Parceria próxima com nossos clientes",
      Icon: Users,
    },
    {
      title: "Resultado",
      description: "Foco em métricas e otimização contínua",
      Icon: TrendingUp,
    },
  ];

  return (
    <section className="py-20 bg-background overflow-x-hidden">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Nossa Missão</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Simplificar a gestão de frotas com soluções tecnológicas integradas
            que reduzem custos e aumentam a eficiência.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-16 mb-16">
          {/* Left column - About us */}
          <Reveal
            direction="left"
            delay={200}
            duration={900}
            className="space-y-6"
          >
            <h3 className="text-2xl font-bold">Quem Somos</h3>
            <p className="leading-relaxed text-muted-foreground">
              A Trajetto nasceu da necessidade de simplificar processos
              complexos de gestão de frota. Fundada por especialistas em
              logística e tecnologia, nossa empresa combina conhecimento
              profundo do setor com inovação tecnológica.
            </p>
            <p className="leading-relaxed text-muted-foreground">
              Atendemos empresas de todos os portes, desde PMEs com pequenas
              frotas até grandes corporações com centenas de veículos. Nossa
              plataforma adaptável se ajusta às necessidades específicas de cada
              cliente.
            </p>
            <div className="pt-4">
              <Link
                href="#timeline"
                className="text-[#d81b60] font-medium hover:underline"
              >
                Conheça nossa história →
              </Link>
            </div>
          </Reveal>

          {/* Right column - Values */}
          <Reveal
            direction="right"
            delay={400}
            duration={900}
            className="space-y-8"
          >
            <h3 className="text-2xl font-bold">Nossos Valores</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {missionData.map(({ title, Icon, description }, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div className="bg-[#d81b60]/10 p-3 rounded-full">
                    <Icon className="h-6 w-6 text-[#d81b60]" />
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">{title}</h4>
                    <p className="text-muted-foreground text-sm">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        {/* Differentials */}
        <div className="mt-24">
          <h3
            className="text-2xl md:text-3xl 
            font-bold text-center mb-12"
          >
            Nossos Diferenciais
          </h3>

          <div className="grid md:grid-cols-3 gap-8">
            <Reveal
              direction="up"
              delay={200}
              duration={600}
              className="bg-card rounded-xl p-6 shadow-lg 
              border border-muted/10"
            >
              <div
                className="w-12 h-12 bg-gradient-to-br 
                from-orange-400 to-[#f06292] rounded-lg 
                flex items-center justify-center text-white mb-4"
              >
                <Truck className="h-6 w-6" />
              </div>
              <h4 className="text-xl font-bold mb-2">Gestão Integrada</h4>
              <p className="text-muted-foreground">
                Nossa plataforma conecta todos os aspectos da gestão de frotas:
                manutenção, combustível, rotas, motoristas e documentação.
              </p>
            </Reveal>

            <Reveal
              direction="up"
              delay={400}
              duration={600}
              className="bg-card rounded-xl p-6 
                shadow-lg border border-muted/10"
            >
              <div
                className="w-12 h-12 bg-gradient-to-br from-blue-400 
                to-[#f06292] rounded-lg flex items-center j
                justify-center text-white mb-4"
              >
                <BarChart className="h-6 w-6" />
              </div>
              <h4 className="text-xl font-bold mb-2">Analytics Avançado</h4>
              <p className="text-muted-foreground">
                Ferramentas de análise de dados que transformam informações em
                insights acionáveis para otimizar operações.
              </p>
            </Reveal>

            <Reveal
              direction="up"
              delay={600}
              duration={600}
              className="bg-card rounded-xl p-6 
              shadow-lg border border-muted/10"
            >
              <div
                className="w-12 h-12 bg-gradient-to-br from-purple-400 
                to-[#f06292] rounded-lg flex items-center 
                justify-center text-white mb-4"
              >
                <Clock className="h-6 w-6" />
              </div>
              <h4 className="text-xl font-bold mb-2">Suporte Dedicado</h4>
              <p className="text-muted-foreground">
                Equipe especializada disponível de segunda a sexta, das 09h às
                18h, com atendimento rápido e personalizado.
              </p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
};

export { AboutMissionSection };
