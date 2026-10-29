import { Shimmer } from "@/components/site/editorial/shimmer";

/** Mirrors blog/[slug]/page.tsx: centered header, index sidebar, prose column. */
const Loading = (): JSX.Element => (
  <main aria-busy="true" aria-label="Carregando o artigo">
    <div className="px-[clamp(20px,4vw,40px)] pb-[clamp(36px,5vw,56px)] pt-[clamp(116px,14vh,150px)]">
      <div className="mx-auto flex max-w-[860px] flex-col items-center gap-[22px]">
        <div className="flex gap-2.5">
          <Shimmer className="h-9 w-20 rounded-full" />
          <Shimmer className="h-9 w-40 rounded-full" />
        </div>
        <Shimmer className="h-14 w-[86%] rounded-[14px]" />
        <Shimmer className="h-14 w-[60%] rounded-[14px]" />
        <Shimmer className="h-6 w-full max-w-[680px] rounded-lg" />
        <Shimmer className="h-6 w-3/4 max-w-[520px] rounded-lg" />
        <Shimmer className="h-10 w-full max-w-[520px] rounded-xl" />
      </div>
    </div>

    <div className="px-[clamp(20px,4vw,40px)] pb-[clamp(56px,8vw,96px)]">
      <div className="mx-auto grid max-w-[1160px] grid-cols-[minmax(0,1fr)] items-start gap-[clamp(32px,5vw,72px)] min-[1100px]:grid-cols-[220px_minmax(0,1fr)]">
        <div className="hidden flex-col gap-3 min-[1100px]:flex">
          <Shimmer className="h-3 w-28 rounded-md" />
          {Array.from({ length: 8 }, (_, index) => (
            <Shimmer key={index} className="h-4 w-full rounded-md" />
          ))}
        </div>
        <div className="flex w-full max-w-[740px] flex-col gap-3 justify-self-center">
          {[
            "w-[92%]",
            "w-full",
            "w-[84%]",
            "w-[96%]",
            "w-[70%]",
            "w-[88%]",
            "w-full",
            "w-[78%]",
          ].map((width, index) => (
            <Shimmer key={index} className={`h-[18px] rounded-lg ${width}`} />
          ))}
        </div>
      </div>
    </div>
  </main>
);

export default Loading;
