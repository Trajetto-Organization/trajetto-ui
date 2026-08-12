import { Reveal } from "@/components/shared/reveal";

const BlogTitleSubtitle = (): JSX.Element => {
  return (
    <div
      className="text-center max-w-3xl
      mx-auto py-16 sm:py-20"
    >
      <Reveal direction="none" delay={300}>
        <h2
          className="text-4xl md:text-5xl
          font-bold tracking-tight mb-4"
        >
          Trajetto Blog
        </h2>
      </Reveal>

      <Reveal direction="left" delay={400}>
        <p
          className="mt-4 text-xl
          text-muted-foreground max-w-2xl mx-auto"
        >
          Descubra como reduzir custos, aumentar eficiência e transformar sua
          operação logística.
        </p>
      </Reveal>
    </div>
  );
};

export { BlogTitleSubtitle };
