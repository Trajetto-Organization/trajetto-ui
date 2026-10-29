import { PhoneMockup } from "@/components/site/phone-mockup";
import {
  Container,
  Eyebrow,
  SectionHeading,
} from "@/components/site/primitives";
import { Reveal } from "@/components/site/reveal";
import { cn } from "@/lib/utils";

import { MODULE_BG, MODULE_SOFT_BG, MODULE_TEXT, STORY } from "./content";
import { StoryScroller } from "./story-scroller";

/**
 * "Um dia no app": the scroll-driven phone from 900px (StoryScroller), and
 * below that one card per step with its own phone, as the design does.
 * Both are in the HTML; CSS shows one, so no width is guessed on the server.
 */
const AppStory = (): JSX.Element => (
  <section
    id="telas"
    aria-labelledby="telas-titulo"
    className="px-[clamp(20px,4vw,40px)] py-[clamp(64px,9vw,120px)]"
  >
    <Container>
      <Reveal className="mb-[clamp(24px,4vw,40px)] max-w-[680px]">
        <Eyebrow className="mb-4">UM DIA NO APP</Eyebrow>
        <SectionHeading id="telas-titulo">
          Da primeira parada ao último checklist.
        </SectionHeading>
      </Reveal>

      <StoryScroller />

      <div className="flex flex-col gap-5 min-[900px]:hidden">
        {STORY.map((item) => (
          <Reveal
            as="article"
            key={item.screen}
            className="flex flex-col gap-3.5 rounded-3xl border border-site-line bg-site-surface p-6"
          >
            <span
              className={cn(
                "inline-flex items-center gap-2 self-start rounded-full px-3 py-1.5 text-[12.5px] font-semibold",
                MODULE_SOFT_BG[item.module],
                MODULE_TEXT[item.module],
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "size-[7px]",
                  item.module === "f" ? "rounded-[2px]" : "rounded-full",
                  MODULE_BG[item.module],
                )}
              />
              {item.moduleLabel}
            </span>
            <h3 className="m-0 font-site-display text-[28px] font-medium leading-[1.05] tracking-[-.03em]">
              {item.title}
            </h3>
            <p className="m-0 text-base leading-[1.6] text-site-muted">
              {item.description}
            </p>
            <div className="mx-auto mt-2 w-[min(240px,70%)]">
              <PhoneMockup screen={item.screen} />
            </div>
          </Reveal>
        ))}
      </div>
    </Container>
  </section>
);

export { AppStory };
