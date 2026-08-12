import { Reveal } from "@/components/shared/reveal";

const Step = (): JSX.Element => {
  return (
    <Reveal
      direction="scale-y"
      delay={400}
      className="h-full w-[3px] mt-4 rounded-md
      bg-gradient-to-b from-[#ffd6cc] via-[#f50057]
      to-transparent"
    />
  );
};

export { Step };
