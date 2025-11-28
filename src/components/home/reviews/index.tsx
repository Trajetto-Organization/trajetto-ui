import { Comments } from "./comments";

const Reviews = (): JSX.Element => {
  return (
    <section
      className="pt-24 bg-gradient-to-b 
      from-background to-background/50"
    >
      <div className="text-center space-y-4 mb-8">
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
          estão dizendo sobre Trajetto
        </p>
      </div>
      <div className="w-full overflow-x-hidden">
        <Comments />
      </div>
    </section>
  );
};

export { Reviews };
