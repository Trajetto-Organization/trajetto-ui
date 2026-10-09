import { Shimmer } from "@/components/site/editorial/shimmer";

/** Mirrors blog/page.tsx: hero with search, category chips, featured post, card grid. */
const Loading = (): JSX.Element => (
  <main aria-busy="true" aria-label="Carregando o blog">
    <div className="px-[clamp(20px,4vw,40px)] pb-[clamp(28px,4vw,44px)] pt-[clamp(120px,15vh,160px)]">
      <div className="mx-auto grid max-w-[1200px] grid-cols-[repeat(auto-fit,minmax(min(100%,460px),1fr))] items-end gap-x-16 gap-y-8">
        <div className="flex flex-col gap-[22px]">
          <Shimmer className="h-3 w-36 rounded-md" />
          <Shimmer className="h-[clamp(140px,18vw,250px)] w-full max-w-[520px] rounded-2xl" />
        </div>
        <div className="flex flex-col gap-[18px]">
          <Shimmer className="h-[84px] w-full max-w-[480px] rounded-xl" />
          <Shimmer className="h-14 w-full rounded-2xl" />
        </div>
      </div>
      <div className="mx-auto mt-[clamp(32px,4vw,44px)] flex max-w-[1200px] flex-wrap gap-2">
        {[
          "w-[88px]",
          "w-[160px]",
          "w-[140px]",
          "w-[160px]",
          "w-[120px]",
          "w-[180px]",
        ].map((width, index) => (
          <Shimmer key={index} className={`h-10 rounded-full ${width}`} />
        ))}
      </div>
    </div>

    <div className="px-[clamp(20px,4vw,40px)] pb-[clamp(64px,8vw,104px)]">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-[clamp(20px,3vw,28px)]">
        <div className="border-t border-site-line pt-[18px]">
          <Shimmer className="h-4 w-24 rounded-md" />
        </div>
        <Shimmer className="h-[340px] rounded-[30px]" />
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,340px),1fr))] gap-5">
          {Array.from({ length: 6 }, (_, index) => (
            <Shimmer key={index} className="h-[420px] rounded-[24px]" />
          ))}
        </div>
      </div>
    </div>
  </main>
);

export default Loading;
