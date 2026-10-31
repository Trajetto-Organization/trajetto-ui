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
        "relative mx-auto min-h-fit w-full max-w-[400px] overflow-hidden rounded-2xl p-4",
        // light styles
        "bg-white [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]",
        // dark styles (no backdrop blur: over the solid zinc-900 panel it
        // blurred nothing visible, and cost a filter pass on every moving
        // card in every frame)
        "dark:bg-transparent dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]",
      )}
    >
      <div className="flex flex-row items-center gap-3">
        <div
          className="flex size-10 items-center justify-center rounded-2xl shrink-0"
          style={{
            backgroundColor: color,
          }}
        >
          <span
            className="text-base leading-none 
            flex items-center justify-center 
            w-full h-full"
          >
            {icon}
          </span>
        </div>
        <div className="flex flex-col overflow-hidden">
          <figcaption
            className="flex flex-row items-center whitespace-pre 
            text-lg font-medium text-black dark:text-white "
          >
            <span className="text-sm sm:text-lg">{name}</span>
            <span className="mx-1">·</span>
            {/* gray-500 on the dark theme's see-through card is 3.7:1 against
                the zinc-900 panel; gray-400 is about 7:1. */}
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {time}
            </span>
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
  // The feed wraps around these on its own (AnimatedList).
  const notifications = [
    {
      name: "Nova Multa Registrada",
      description: "Multa de R$ 195,23 registrada para o veículo ABC-1234.",
      time: "às 17:49",
      icon: "🚨",
      color: "#FF3D71",
    },
    {
      name: "Nova Conta a Pagar",
      description: "Nova conta a pagar de R$ 1.250,00 foi atribuída a você.",
      time: "às 17:49",
      icon: "💳",
      color: "#1E86FF",
    },
    {
      name: "Abastecimento Atualizado",
      description: "Abastecimento atualizado para o veículo AGL0944.",
      time: "às 17:49",
      icon: "⛽",
      color: "#1E86FF",
    },
    {
      name: "Novo Usuário Cadastrado",
      description:
        "Usuário João Silva criado | E-mail não verificado: joaosilva@gmail.com.",
      time: "às 17:49",
      icon: "👤",
      color: "#00C9A7",
    },
    {
      name: "Nova Ordem de Serviço",
      description:
        "Você foi designado como responsável pela ordem de serviço do veículo XYZ-5678.",
      time: "às 17:49",
      icon: "🔧",
      color: "#4CAF50",
    },
  ];

  // Clipped to its box, where the mask already cuts the paint: the feed keeps
  // six cards, past it, and unclipped those cards still lay under the
  // heading below, for contrast checkers reading the DOM and on screen
  // wherever the unprefixed `mask-image` is ignored (Chromium before 120).
  //
  // Inert, because it is a picture of the product rather than content: made-up
  // notifications on a loop. Screen readers no longer read them out, nothing
  // in it takes the pointer or focus, and contrast checkers skip it, as WCAG
  // 1.4.3 exempts pure decoration. Each card pops in over 450ms
  // every 1.4s, and Lighthouse, catching one halfway, failed /login on the
  // half-transparent time label about one run in two.
  return (
    <div
      // @ts-expect-error React 18 renders `inert` only from a string, the empty
      // one giving the bare attribute, while the types Next pulls in
      // (react/experimental) say boolean. React 19 takes `inert` as is.
      inert=""
      className="absolute right-2 top-4 h-[300px] w-full overflow-hidden border-none
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
