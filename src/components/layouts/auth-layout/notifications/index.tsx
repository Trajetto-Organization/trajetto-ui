import { AnimatedList } from "@/components/ui/animated-list";
import { cn } from "@/lib/utils";

interface NotificationProps {
  name: string;
  description: string;
  icon: string;
  color: string;
  time: string;
}

const Notification = ({
  name,
  description,
  icon,
  color,
  time,
}: NotificationProps): JSX.Element => {
  return (
    <figure
      className={cn(
        "relative mx-auto min-h-fit w-full max-w-[400px] cursor-pointer overflow-hidden rounded-2xl p-4",
        // animation styles
        "transition-all duration-200 ease-in-out hover:scale-[103%]",
        // light styles
        "bg-white [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]",
        // dark styles
        "transform-gpu dark:bg-transparent dark:backdrop-blur-md dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]",
      )}
    >
      <div className="flex flex-row items-center gap-3">
        <div
          className="flex size-10 items-center justify-center rounded-2xl"
          style={{
            backgroundColor: color,
          }}
        >
          <span className="text-lg">{icon}</span>
        </div>
        <div className="flex flex-col overflow-hidden">
          <figcaption
            className="flex flex-row items-center whitespace-pre 
            text-lg font-medium text-black dark:text-white "
          >
            <span className="text-sm sm:text-lg">{name}</span>
            <span className="mx-1">·</span>
            <span className="text-xs text-gray-500">{time}</span>
          </figcaption>
          <p className="text-sm font-normal text-black dark:text-white/60">
            {description}
          </p>
        </div>
      </div>
    </figure>
  );
};

const Notifications = (): JSX.Element => {
  let notifications = [
    {
      name: "Manutenção Agendada",
      description: "O veículo ABC-1234 tem manutenção programada para amanhã.",
      time: "15m atrás",
      icon: "🔧",
      color: "#FF3D71",
    },
    {
      name: "Desvio de Rota",
      description: "O veículo XYZ-5678 desviou da rota planejada.",
      time: "10m atrás",
      icon: "⚠️",
      color: "#FFB800",
    },
    {
      name: "Alerta de Combustível",
      description:
        "O nível de combustível do veículo DEF-9101 está abaixo de 10%.",
      time: "5m atrás",
      icon: "⛽",
      color: "#1E86FF",
    },
    {
      name: "Novo Relatório Disponível",
      description: "O relatório semanal de desempenho da frota está pronto.",
      time: "2m atrás",
      icon: "📊",
      color: "#00C9A7",
    },
  ];

  notifications = Array.from({ length: 10 }, () => notifications).flat();

  return (
    <div
      className="absolute right-2 top-4 h-[300px] w-full border-none 
      transition-all duration-300 ease-out group-hover:scale-105 px-4
      [mask-image:linear-gradient(to_top,transparent_10%,#000_100%)] "
    >
      <AnimatedList>
        {notifications.map((item, idx) => (
          <Notification {...item} key={idx} />
        ))}
      </AnimatedList>
    </div>
  );
};

export { Notifications };
