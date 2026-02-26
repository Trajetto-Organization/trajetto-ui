import { Comments } from "./comments";
import { Step } from "@/components/step";

const Reviews = (): JSX.Element => {
  return (
    <>
      <div
        className="w-full flex flex-row 
        justify-center h-24 mt-7"
      >
        <Step />
      </div>
      <section
        className="mt-24 bg-gradient-to-b 
        from-background to-background/50"
      >
        <div className="text-center space-y-4 mb-3 px-6 md:px-16">
          <h2
            className="text-3xl font-bold tracking-tight 
            sm:text-4xl md:text-5xl"
          >
            O que as empresas falam de nós
          </h2>
          <p
            className="text-xl text-muted-foreground 
            max-w-[700px] mx-auto"
          >
            Não acredite apenas em nossa palavra. Aqui está o que empresas reais
            estão dizendo sobre o Trajetto
          </p>
        </div>
        <div className="w-full overflow-x-hidden">
          <Comments />
        </div>
      </section>
    </>
  );
};

export { Reviews };
