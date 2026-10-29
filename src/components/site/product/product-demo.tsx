"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { Check, ScanLine, TriangleAlert } from "lucide-react";

import { Eyebrow } from "@/components/site/primitives";
import { Reveal } from "@/components/site/reveal";
import { cn } from "@/lib/utils";

import type { ProductModule } from "./content";
import { prefersReducedMotion } from "./motion";
import styles from "./product.module.css";

/**
 * The dark band of each product page, an interactive close-up of the
 * module's signature check: the odometer read by AI (frotas) and the
 * verifiable proof of delivery (entregas). Both are simulations with fixed
 * data; the page says what the product does, these show it.
 */

const HEADING =
  "m-0 font-site-display text-[clamp(34px,4.6vw,60px)] font-medium leading-[1.02] tracking-[-.035em] [text-wrap:balance]";
const BODY =
  "m-0 max-w-[500px] text-[17px] leading-[1.6] text-[#a8aab5] [text-wrap:pretty]";

/** A two-option segmented control (radio group) on the dark band. */
const Segmented = <T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
}): JSX.Element => {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (
      !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
    )
      return;
    event.preventDefault();
    const index = options.findIndex((option) => option.value === value);
    const step = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
    const next = (index + step + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(
        "flex max-w-full gap-1 rounded-[14px] border border-white/[.08] bg-white/[.06] p-1",
        className,
      )}
    >
      {options.map((option, index) => {
        const on = option.value === value;

        return (
          <button
            key={option.value}
            ref={(element) => {
              refs.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              "min-h-[44px] whitespace-nowrap rounded-[10px] px-4 py-2.5 text-sm font-medium text-[#f3f3f6] outline-none transition-colors duration-300",
              "focus-visible:ring-2 focus-visible:ring-white/50 max-[360px]:px-3 max-[360px]:text-[13px]",
              on ? "bg-white/[.14]" : "bg-transparent hover:bg-white/[.06]",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

/** The result banner: green when it checks out, amber or red when not. */
const Verdict = ({
  tone,
  title,
  detail,
}: {
  tone: "ok" | "warn" | "fail";
  title: string;
  detail?: string;
}): JSX.Element => {
  const palette = {
    ok: {
      box: "bg-[rgba(16,185,129,.12)] border-[rgba(16,185,129,.3)]",
      dot: "bg-[#10b981] text-white",
      text: "text-[#6ee7b7]",
    },
    warn: {
      box: "bg-[rgba(245,158,11,.12)] border-[rgba(245,158,11,.35)]",
      dot: "bg-[#f59e0b] text-[#0b0b10]",
      text: "text-[#fcd34d]",
    },
    fail: {
      box: "bg-[rgba(239,68,68,.12)] border-[rgba(239,68,68,.35)]",
      dot: "bg-[#ef4444] text-white",
      text: "text-[#fca5a5]",
    },
  }[tone];

  return (
    <div
      role="status"
      className={cn(
        "flex animate-[tpUp_.45s_cubic-bezier(.22,1,.36,1)_both] items-center gap-3 rounded-[14px] border px-4 py-3.5",
        palette.box,
      )}
    >
      <span
        className={cn(
          "flex size-7 shrink-0 animate-tp-pop items-center justify-center rounded-full",
          palette.dot,
        )}
      >
        {tone === "ok" ? (
          <Check aria-hidden className="size-3.5" strokeWidth={3} />
        ) : (
          <TriangleAlert
            aria-hidden
            className="size-[15px]"
            strokeWidth={2.4}
          />
        )}
      </span>
      <div>
        <p className={cn("m-0 text-[14.5px] font-semibold", palette.text)}>
          {title}
        </p>
        {detail ? (
          <p className="m-0 text-[13px] text-[#a8aab5]">{detail}</p>
        ) : null}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Frotas: the odometer read by AI                                     */
/* ------------------------------------------------------------------ */

const FleetAiDemo = (): JSX.Element => {
  const [mode, setMode] = useState<"ok" | "diff">("ok");
  const ok = mode === "ok";

  return (
    <>
      <Reveal className="flex flex-col gap-[22px]">
        <Eyebrow tone="dark-band">INTELIGÊNCIA ARTIFICIAL</Eyebrow>
        <h2 id="demo-titulo" className={HEADING}>
          A IA lê o odômetro e confere o que foi digitado.
        </h2>
        <p className={BODY}>
          A quilometragem é lida na foto e comparada ao valor que o motorista
          digitou. Quando os dois não batem, o abastecimento fica sinalizado
          para conferência.
        </p>
        <Segmented
          label="Simular abastecimento"
          value={mode}
          onChange={setMode}
          className="self-start"
          options={[
            { value: "ok", label: "Valores conferem" },
            { value: "diff", label: "Valores divergentes" },
          ]}
        />
      </Reveal>

      <Reveal
        delay={120}
        className="flex min-w-0 flex-col gap-3.5 rounded-[26px] border border-white/[.08] bg-[#121218] p-5"
      >
        <div className="relative flex h-[200px] flex-col items-center justify-center gap-1.5 overflow-hidden rounded-[18px] border border-white/[.06] bg-[linear-gradient(#1e1e28,#0f0f15)]">
          <span className="font-site-mono text-[11px] tracking-[.12em] text-[#9d9fab]">
            FOTO DO ODÔMETRO
          </span>
          <span className="font-site-mono text-[clamp(36px,5vw,48px)] tracking-[.1em]">
            187.450
          </span>
          <span
            aria-hidden
            className={cn(
              "absolute inset-x-0 top-[18px] h-0.5 bg-[linear-gradient(90deg,transparent,#a78bfa,transparent)] shadow-[0_0_18px_#a78bfa]",
              styles.scanLine,
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="min-w-0 rounded-[14px] border border-white/[.08] bg-white/[.04] px-4 py-3.5">
            <p className="m-0 text-xs text-[#9d9fab]">Lido pela IA</p>
            <p className="mb-0 mt-1 font-site-mono text-xl max-[360px]:text-lg">
              187.450 <span className="text-xs text-[#9d9fab]">km</span>
            </p>
          </div>
          <div
            className={cn(
              "min-w-0 rounded-[14px] border bg-white/[.04] px-4 py-3.5 transition-colors [transition-duration:400ms]",
              ok ? "border-white/[.08]" : "border-[rgba(245,158,11,.45)]",
            )}
          >
            <p className="m-0 text-xs text-[#9d9fab]">
              Digitado pelo motorista
            </p>
            <p
              className={cn(
                "mb-0 mt-1 font-site-mono text-xl transition-colors [transition-duration:400ms] max-[360px]:text-lg",
                ok ? "text-[#f3f3f6]" : "text-[#fcd34d]",
              )}
            >
              {ok ? "187.450" : "178.450"}{" "}
              <span className="text-xs text-[#9d9fab]">km</span>
            </p>
          </div>
        </div>
        {ok ? (
          <Verdict
            key="ok"
            tone="ok"
            title="Confere com o valor informado"
            detail="O abastecimento segue sem pendência."
          />
        ) : (
          <Verdict
            key="diff"
            tone="warn"
            title="Diferença de 9.000 km"
            detail="Abastecimento sinalizado para conferência."
          />
        )}
      </Reveal>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Entregas: the verifiable proof                                      */
/* ------------------------------------------------------------------ */

const HASH = "9f2c4b7e1a08d6f35c91e2b47a6d0c83f5e19b2a74c6d08e3f1b95a2c7e4d610";
const HASH_ALT =
  "4e81a0c3f97b25d6e0a1c48b3f62d97e05a1b8c4f3e27d90b6a5c1e48f2d703b";
const CHECKS = [
  "Lendo o QR de conferência",
  "Calculando a impressão digital SHA-256",
  "Comparando com o registro original",
] as const;
/** Time per verification step (the design's 650ms). */
const TICK = 650;

/** The design's 11x11 QR: three finder corners plus seeded noise. */
const QR: readonly boolean[] = (() => {
  let seed = 7;
  const random = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const cells: boolean[] = [];
  for (let y = 0; y < 11; y++) {
    for (let x = 0; x < 11; x++) {
      const finder = (x < 3 && y < 3) || (x > 7 && y < 3) || (x < 3 && y > 7);
      const edge =
        finder &&
        (x % 8 === 0 ||
          x % 8 === 2 ||
          y % 8 === 0 ||
          y % 8 === 2 ||
          (x % 8 === 1 && y % 8 === 1));
      cells.push(finder ? edge : random() > 0.5);
    }
  }
  return cells;
})();

const DeliveryProofDemo = (): JSX.Element => {
  const [file, setFile] = useState<"orig" | "alt">("orig");
  // 0 idle, 1–3 the step in progress, 4 done.
  const [phase, setPhase] = useState(0);
  const timer = useRef(0);
  const ran = useRef(false);
  const bandRef = useRef<HTMLDivElement>(null);
  const alt = file === "alt";

  const run = () => {
    window.clearTimeout(timer.current);
    if (prefersReducedMotion()) {
      setPhase(4);
      return;
    }
    setPhase(1);
    const tick = (next: number) => {
      timer.current = window.setTimeout(() => {
        setPhase(next);
        if (next < 4) tick(next + 1);
      }, TICK);
    };
    tick(2);
  };

  // Plays once by itself when the band comes into view, like the design.
  useEffect(() => {
    // The whole dark band decides, as in the design (not just the receipt).
    const band = bandRef.current?.closest("section");
    if (!band || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || ran.current) return;
        ran.current = true;
        observer.disconnect();
        timer.current = window.setTimeout(run, 700);
      },
      { rootMargin: "-15% 0px -15% 0px" },
    );
    observer.observe(band);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer.current);
    };
    // run only touches refs and setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choose = (value: "orig" | "alt") => {
    window.clearTimeout(timer.current);
    setFile(value);
    setPhase(0);
  };

  const busy = phase > 0 && phase < 4;

  return (
    <>
      <Reveal className="flex flex-col gap-[22px]">
        <Eyebrow tone="dark-band">COMPROVANTE VERIFICÁVEL</Eyebrow>
        <h2 id="demo-titulo" className={HEADING}>
          Um comprovante que qualquer pessoa confere.
        </h2>
        <p className={BODY}>
          Cada entrega concluída gera um PDF com os dados do registro, a
          impressão digital SHA-256 do arquivo e um QR de verificação pública.
        </p>
        <div className="flex flex-wrap items-center gap-2.5">
          <Segmented
            label="Simular arquivo"
            value={file}
            onChange={choose}
            options={[
              { value: "orig", label: "Arquivo original" },
              { value: "alt", label: "Arquivo alterado" },
            ]}
          />
          <button
            type="button"
            onClick={run}
            disabled={busy}
            className="inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-[13px] bg-[#f3f3f6] px-[18px] py-[13px] text-sm font-semibold text-[#0b0b10] outline-none transition-transform duration-200 hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b10] disabled:cursor-default disabled:opacity-70 motion-reduce:hover:translate-y-0"
          >
            <ScanLine aria-hidden className="size-[17px]" />
            Verificar comprovante
          </button>
        </div>
      </Reveal>

      <Reveal
        delay={120}
        className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,250px),1fr))] items-start gap-4"
      >
        <div
          ref={bandRef}
          className="rotate-[-1.5deg] rounded-[14px] bg-white p-5 text-[#1e293b] shadow-[0_30px_60px_-20px_rgba(0,0,0,.6)]"
        >
          <div className="flex items-center justify-between gap-2.5 border-b border-[#e2e8f0] pb-2.5">
            <span className="text-[13px] font-bold">
              Comprovante de entrega
            </span>
            <span className="text-[11px] text-[#64748b]">Trajetto</span>
          </div>
          <dl className="m-0 mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[11.5px]">
            <dt className="text-[#64748b]">Pedido</dt>
            <dd className="m-0 font-semibold">48214</dd>
            <dt className="text-[#64748b]">Destinatário</dt>
            <dd className="m-0 font-semibold">Farmácia Vida</dd>
            <dt className="text-[#64748b]">Recebido por</dt>
            <dd
              className={cn(
                "m-0 font-semibold",
                alt ? "text-[#dc2626]" : "text-[#1e293b]",
              )}
            >
              {alt ? "M. Alves (editado)" : "Mariana Alves"}
            </dd>
            <dt className="text-[#64748b]">Data</dt>
            <dd className="m-0 font-semibold">28/09/2026 · 14:32</dd>
            <dt className="text-[#64748b]">Localização</dt>
            <dd className="m-0 font-semibold">Registrada no envio</dd>
          </dl>
          <svg
            aria-hidden
            viewBox="0 0 160 34"
            className="mt-2 block h-[30px] w-full"
          >
            <path
              d="M6 24 C 16 4, 24 6, 24 20 S 36 30, 44 14 S 58 6, 64 20 S 78 28, 88 12 L 152 10"
              fill="none"
              stroke="#1e293b"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          <div className="mt-2.5 flex items-center gap-3 border-t border-dashed border-[#cbd5e1] pt-3">
            <div
              aria-hidden
              className="grid shrink-0 grid-cols-[repeat(11,5px)] rounded border border-[#e2e8f0] p-1"
            >
              {QR.map((dark, index) => (
                <span
                  key={index}
                  className={cn(
                    "size-[5px]",
                    dark ? "bg-[#0f172a]" : "bg-white dark:bg-white",
                  )}
                />
              ))}
            </div>
            <div className="min-w-0">
              <p className="m-0 text-[10px] text-[#64748b]">SHA-256</p>
              <p
                className={cn(
                  "mb-0 mt-0.5 break-all font-site-mono text-[10px] leading-[1.4]",
                  alt && phase >= 4 ? "text-[#dc2626]" : "text-[#334155]",
                )}
              >
                {alt ? HASH_ALT : HASH}
              </p>
            </div>
          </div>
        </div>

        <ol
          aria-label="Verificação do comprovante"
          className="m-0 flex list-none flex-col gap-1.5 p-0"
        >
          {CHECKS.map((label, index) => {
            const done = phase > index + 1 || phase >= 4;
            const doing = phase === index + 1;
            const failed = alt && index === 2 && phase >= 4;
            const color = failed ? "#ef4444" : "#f0558e";

            return (
              <li
                key={label}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3.5 py-3 transition-colors [transition-duration:350ms]",
                  doing ? "bg-white/[.06]" : "bg-transparent",
                )}
              >
                <span
                  className="flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px] text-white transition-all [transition-duration:350ms]"
                  style={{
                    borderColor: done
                      ? color
                      : doing
                        ? "rgba(255,255,255,.55)"
                        : "rgba(255,255,255,.18)",
                    background: done ? color : "transparent",
                  }}
                >
                  <Check
                    aria-hidden
                    className="size-3 transition-opacity duration-300"
                    strokeWidth={3.2}
                    style={{ opacity: done && !failed ? 1 : 0 }}
                  />
                </span>
                <span
                  className={cn(
                    "text-sm transition-colors [transition-duration:350ms]",
                    // Pending steps: the design's #6b6d78 is 3.8:1 on the band; #8b8d99 clears AA.
                    done || doing ? "text-[#f3f3f6]" : "text-[#8b8d99]",
                  )}
                >
                  {label}
                </span>
              </li>
            );
          })}
          {phase >= 4 ? (
            <li className="mt-1.5 list-none">
              {alt ? (
                <Verdict
                  key="fail"
                  tone="fail"
                  title="Impressão digital não confere: o arquivo foi alterado"
                />
              ) : (
                <Verdict
                  key="ok"
                  tone="ok"
                  title="Documento confere com o original"
                />
              )}
            </li>
          ) : null}
        </ol>
      </Reveal>
    </>
  );
};

/* ------------------------------------------------------------------ */

const DemoBand = ({ children }: { children: ReactNode }): JSX.Element => (
  <section
    aria-labelledby="demo-titulo"
    className="relative overflow-hidden bg-[#0b0b10] px-[clamp(20px,4vw,40px)] py-[clamp(80px,11vw,140px)] text-[#f3f3f6]"
  >
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        background:
          "radial-gradient(40% 50% at 80% 40%, var(--acc-dark-glow), transparent 70%)",
      }}
    />
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 opacity-50",
        styles.gridBackdrop,
      )}
    />
    <div className="relative mx-auto grid max-w-[1200px] grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] items-center gap-[clamp(40px,6vw,80px)]">
      {children}
    </div>
  </section>
);

const ProductDemo = ({ module }: { module: ProductModule }): JSX.Element => (
  <DemoBand>
    {module === "frotas" ? <FleetAiDemo /> : <DeliveryProofDemo />}
  </DemoBand>
);

export { ProductDemo };
