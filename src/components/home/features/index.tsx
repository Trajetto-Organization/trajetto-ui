import { Step } from "@/components/step";
import {
  BarChart3,
  Fuel,
  Shield,
  Users,
  AlertTriangle,
  Settings,
} from "lucide-react";

const Features = (): JSX.Element => {
  const features = [
    {
      icon: Shield,
      title: "Controle de Manutenção",
      description:
        "Gerencie ordens de serviço, acompanhe intervalos de manutenção por quilometragem e mantenha histórico completo de cada veículo.",
    },
    {
      icon: Fuel,
      title: "Gestão de Combustível",
      description:
        "Monitore abastecimentos, controle custos por litro, acompanhe quilometragem e otimize o consumo da sua frota.",
    },
    {
      icon: Users,
      title: "Gestão de Equipe",
      description:
        "Controle total de usuários, motoristas e permissões com autenticação de dois fatores e níveis de acesso granulares.",
    },
    {
      icon: AlertTriangle,
      title: "Controle de Multas",
      description:
        "Registre e monitore infrações de trânsito, associe multas aos veículos e motoristas responsáveis para controle total.",
    },
    {
      icon: Settings,
      title: "Multi-Filiais",
      description:
        "Gerencie múltiplas filiais em uma única plataforma com isolamento total de dados e permissões específicas.",
    },
    {
      icon: BarChart3,
      title: "Dashboards Inteligentes",
      description:
        "Métricas em tempo real, relatórios personalizados e insights poderosos para tomada de decisões estratégicas.",
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
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
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
