import { Step } from "@/components/step";
import { Activity, BarChart3, Map, Shield } from "lucide-react";

const Features = (): JSX.Element => {
  const features = [
    {
      icon: Shield,
      title: "Manutenção Preditiva",
      description:
        "Previsões baseadas em IA para evitar avarias e otimizar os calendários de manutenção para toda a sua frota.",
    },
    {
      icon: Activity,
      title: "Monitoramento Detalhado",
      description:
        "Monitore status, localização e desempenho do veículo em tempo real com máxima precisão e eficiência.",
    },
    {
      icon: Map,
      title: "Otimização de Rota",
      description:
        "Algoritmos de roteamento inteligentes para reduzir o consumo de combustível e melhorar a eficiência em todas as suas rotas.",
    },
    {
      icon: BarChart3,
      title: "Análise Avançada",
      description:
        "Informações abrangentes sobre o desempenho da frota e métricas operacionais com relatórios detalhados.",
    },
  ];

  return (
    <>
      <div
        className="w-full flex flex-row 
        justify-center h-24 mt-7"
        id="como-funciona"
      >
        <Step />
      </div>
      <section
        className="py-24 bg-gradient-to-b 
        from-background to-background/50"
      >
        <div className="container px-4 md:px-6">
          <div className="text-center space-y-4 mb-16">
            <h2
              className="text-3xl font-bold tracking-tight 
              sm:text-4xl md:text-5xl"
            >
              Tudo o que você precisa para gerenciar sua frota
            </h2>
            <p
              className="text-xl text-muted-foreground 
              max-w-[700px] mx-auto"
            >
              Uma solução completa para gestão moderna de frotas, projetada para
              empresas de todos os tamanhos
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group relative overflow-hidden rounded-lg 
                border bg-card p-6 hover:shadow-lg transition-all duration-300"
              >
                <div className="mb-4">
                  <feature.icon
                    className="h-10 w-10 text-primary 
                  group-hover:text-[#d81b60] transition-colors"
                  />
                </div>
                <h3
                  className="text-xl font-semibold mb-2 
                group-hover:text-[#d81b60] transition-colors"
                >
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export { Features };
