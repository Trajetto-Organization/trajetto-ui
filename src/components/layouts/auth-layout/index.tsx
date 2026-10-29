import { BellIcon } from "lucide-react";

import { Notifications } from "./notifications";
import { NavigateButton } from "./navigate-button";

import { LogoMark } from "@/components/shared/logo-mark";
import { ThemeToggle } from "@/components/shared/theme-toggle";

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout = ({ children }: AuthLayoutProps): JSX.Element => {
  return (
    <main className="flex flex-grow">
      <div
        className="flex w-full flex-col-reverse 
        justify-end lg:grid lg:grid-cols-2"
      >
        <div
          className="relative hidden h-full flex-col 
          bg-muted p-10 text-white lg:flex dark:border-r"
        >
          <div className="absolute inset-0 bg-zinc-900" />
          <div className="relative z-20 flex items-center gap-2.5 text-lg font-medium">
            <LogoMark width={36} priority />
            Trajetto
          </div>
          <section className="relative z-20 mt-auto left-[15%]">
            <div className="grid w-full auto-rows-[25rem] grid-cols-3 gap-4">
              <div
                className="group relative col-span-3 flex flex-col 
                justify-between lg:col-span-2 rounded-xl overflow-hidden
                shadow-[0px_4px_10px_rgba(0,0,0,0.2)]"
              >
                <Notifications />
                <div
                  className="mt-auto pointer-events-none z-10 flex transform-gpu 
                  flex-col gap-1 p-6 transition-all duration-300 group-hover:-translate-y-2"
                >
                  <BellIcon
                    className="h-12 w-12 origin-left transform-gpu text-neutral-700 
                    transition-all duration-300 ease-in-out group-hover:scale-75"
                  />
                  <h3 className="text-xl font-semibold text-neutral-300">
                    Notificações
                  </h3>
                  <p className="max-w-lg text-neutral-400">
                    Seja notificado quando algo acontecer.
                  </p>
                </div>
              </div>
            </div>
          </section>
          <div className="relative z-20 mt-auto">
            <blockquote className="space-y-2">
              <p className="text-lg">
                &ldquo;Nosso compromisso é ajudá-lo a planejar e acompanhar cada
                passo de forma eficiente, conectando destinos e criando
                possibilidades.&rdquo;
              </p>
              <footer className="text-sm">Trajetto</footer>
            </blockquote>
          </div>
        </div>
        <div
          className="justify-center 
          flex flex-grow px-4
          py-6 relative"
        >
          <NavigateButton />
          {/* The theme switch, in the corner opposite "Voltar ao início":
              same 40px round ghost shape, out of the form's way. */}
          <div className="absolute right-6 top-6">
            <ThemeToggle tone="app" className="size-10 rounded-full" />
          </div>
          <div className="mx-auto flex w-[380px] flex-col mt-14">
            <div className="flex flex-grow flex-col justify-center">
              {children}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export { AuthLayout };
