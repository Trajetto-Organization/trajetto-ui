import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { cn } from "@/lib/utils";

import { CopyButton } from "./copy-button";

/**
 * Code in the portal: a frame with the language and a copy button.
 *
 * No highlighter on purpose: it would be a new dependency and a bundle for
 * a page that is mostly read once and copied from; monospace on a quiet
 * frame is enough to read and paste.
 */

const LANGUAGE_LABELS: Record<string, string> = {
  bash: "curl",
  sh: "curl",
  shell: "curl",
  js: "Node.js",
  javascript: "Node.js",
  mjs: "Node.js",
  ts: "TypeScript",
  typescript: "TypeScript",
  python: "Python",
  py: "Python",
  php: "PHP",
  json: "JSON",
  http: "HTTP",
  text: "Texto",
};

function languageLabel(language: string | undefined): string {
  if (!language) return "Código";

  return LANGUAGE_LABELS[language] ?? language.toUpperCase();
}

interface CodeFrameProps {
  code: string;
  language?: string;
  /** Overrides the language label in the frame's header. */
  title?: string;
  className?: string;
}

const CodeFrame = ({ code, language, title, className }: CodeFrameProps) => {
  const label = title ?? languageLabel(language);

  // Dark in both themes, like the site's code (editorial prose); a hairline
  // separates it from the near-black page in the dark theme.
  return (
    <figure
      className={cn(
        "not-prose my-6 overflow-hidden rounded-2xl bg-[#0e0e14] text-[#e7e7ee] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,.08)]",
        className,
      )}
    >
      <figcaption className="flex items-center justify-between gap-2 border-b border-white/[.08] py-1 pl-5 pr-1.5">
        <span className="truncate font-site-mono text-[11.5px] font-medium tracking-[.06em] text-[#9d9fab]">
          {label}
        </span>
        <CopyButton
          text={code}
          label={`Copiar código ${label}`}
          className="text-[#c5c6d0] hover:bg-white/[.08] hover:text-white focus-visible:ring-white/50"
        />
      </figcaption>
      {/* Focusable: a block that scrolls sideways must be reachable by keyboard. */}
      <pre
        tabIndex={0}
        className="overflow-x-auto px-5 py-[18px] font-site-mono text-[13px] leading-[1.65] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/40"
      >
        <code className={language ? `language-${language}` : undefined}>
          {code}
        </code>
      </pre>
    </figure>
  );
};

interface CodeSample {
  code: string;
  language?: string;
}

/** Text and language of what MDX hands `pre`: a `code` element with a string. */
function sampleOf(node: ReactNode): CodeSample | null {
  if (!isValidElement(node)) return null;

  const props = node.props as { children?: ReactNode; className?: string };
  const child = Children.toArray(props.children)[0];

  if (isValidElement(child)) {
    const code = child.props as { children?: ReactNode; className?: string };

    if (typeof code.children === "string") {
      return {
        code: code.children.replace(/\n$/, ""),
        language: code.className?.match(/language-([\w-]+)/)?.[1],
      };
    }
  }

  return null;
}

/** The MDX `pre`: fenced code gets the frame. */
const DocsPre = ({ children }: { children?: ReactNode }) => {
  const sample = sampleOf(<pre>{children}</pre>);

  if (!sample) {
    return (
      <pre
        tabIndex={0}
        className="my-6 overflow-x-auto rounded-2xl bg-[#0e0e14] px-5 py-[18px] font-site-mono text-[13px] leading-[1.65] text-[#e7e7ee] outline-none focus-visible:ring-2 focus-visible:ring-site-ink/40"
      >
        {children}
      </pre>
    );
  }

  return <CodeFrame code={sample.code} language={sample.language} />;
};

/**
 * The same example in several languages: `<CodeTabs>` around fenced blocks.
 * Each tab is named after its block's language.
 */
const CodeTabs = ({ children }: { children?: ReactNode }) => {
  const samples = Children.toArray(children)
    .map((child) => sampleOf(child as ReactElement))
    .filter((sample): sample is CodeSample => sample !== null);

  if (samples.length === 0) return null;

  const valueOf = (sample: CodeSample, index: number) =>
    `${sample.language ?? "code"}-${index}`;

  return (
    <Tabs defaultValue={valueOf(samples[0], 0)} className="my-6">
      <TabsList className="h-auto flex-wrap justify-start gap-0.5 rounded-[12px] bg-site-soft2 p-1 text-site-muted">
        {samples.map((sample, index) => (
          <TabsTrigger
            key={valueOf(sample, index)}
            value={valueOf(sample, index)}
            className="min-h-[34px] rounded-[9px] px-3 text-[13px] font-medium text-site-muted hover:text-site-ink focus-visible:ring-site-ink/40 focus-visible:ring-offset-site-soft2 data-[state=active]:bg-site-surface data-[state=active]:text-site-ink data-[state=active]:shadow-[0_1px_2px_rgba(14,14,20,.08),0_4px_10px_-4px_rgba(14,14,20,.18)]"
          >
            {languageLabel(sample.language)}
          </TabsTrigger>
        ))}
      </TabsList>
      {/* Every language in the HTML, the inactive ones hidden: readable without
          JavaScript and by search engines, not only after a click. */}
      {samples.map((sample, index) => (
        <TabsContent
          key={valueOf(sample, index)}
          value={valueOf(sample, index)}
          forceMount
          className="mt-2 data-[state=inactive]:hidden"
        >
          <CodeFrame
            code={sample.code}
            language={sample.language}
            className="my-0"
          />
        </TabsContent>
      ))}
    </Tabs>
  );
};

export { CodeFrame, CodeTabs, DocsPre, languageLabel, sampleOf };
export type { CodeSample };
