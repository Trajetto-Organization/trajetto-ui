"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useFormState, useFormStatus } from "react-dom";

import Image from "next/image";
import {
  ArrowLeft,
  Building2,
  Check,
  Fuel,
  Loader2,
  Mail,
  PackageCheck,
  Phone,
  Send,
  ShieldAlert,
  User,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { handleQuoteSubmit } from "@/actions/quote/create-quote";
import { QUOTE_LIMITS, quoteSchema } from "@/schemas/quote-schema";

import {
  useLiveValidation,
  type LiveValidation,
} from "@/components/shared/live-validation";

import { partner } from "@/components/about/team";
import {
  CaptchaTurnstile,
  useCaptchaToken,
} from "@/components/shared/custom/captcha-turnstile";
import { quoteConsumedCaptcha } from "@/components/shared/custom/captcha-turnstile/token-consumed";
import { MovingArrow, siteButtonClass } from "@/components/site/arrow-link";
import { Eyebrow, SectionHeading } from "@/components/site/primitives";
import { Reveal } from "@/components/site/reveal";
import { DARK_BAND, DarkGrid } from "@/components/site/institutional/dark-band";
import { reducedMotion } from "@/components/site/institutional/motion";
import {
  CharCounter,
  SiteField,
  SiteFieldError,
  SiteLabelText,
  SitePrivacyNotice,
  siteInputClass,
} from "@/components/site/institutional/form-field";
import { cn } from "@/lib/utils";

import { useQuoteForm } from "./hooks";
import type { CreateQuoteFormState, QuoteFieldName } from "./quote-form.types";
import {
  EMPTY_QUOTE,
  FIELD_ORDER,
  FIELD_STEP,
  FLEET_SIZES,
  STEP_FIELDS,
  STEP_TITLES,
  formatPhone,
  type QuoteStep,
  type QuoteValues,
} from "./quote-steps";

/**
 * /quote (design: Trajetto Orçamento). The pitch on the left, a three-step
 * form on the right (Operação → Contato → Detalhes, with a summary before
 * sending), and what goes into the proposal in a dark band below.
 *
 * Behaviour kept from the single-page form: one server action through
 * useFormState (a submit that works before hydration, see
 * form-action-stale-guard), the schema's limits on the fields, Turnstile in
 * production, server errors under their fields. The steps are a layer on top:
 * every field stays in the form (inactive steps are hidden, not unmounted),
 * the step's fields are checked on "Continuar" by the action's own schema,
 * and a server error sends the person back to the first step it concerns.
 * Each field is also checked once it is left, then as it changes
 * (decision 16.700). Without scripting the three
 * steps show at once with a single "Solicitar Orçamento".
 *
 * The design's "Quais módulos interessam?" picker is left out: the quote API
 * has no field for it, and this form only collects what it sends.
 */

const QUOTE_PRIVACY_NOTICE_ID = "quote-privacy-notice";
const QUOTE_FORM_TITLE_ID = "quote-form-title";

type Tone = "f" | "d" | "x";

const TONE: Record<Tone, string> = {
  f: "bg-site-violet-soft text-site-violet",
  d: "bg-site-pink-soft text-site-pink",
  x: "bg-site-soft2 text-site-ink",
};

// Only what the product does today (decision 10.5).
const BENEFITS: {
  title: string;
  description: string;
  icon: LucideIcon;
  tone: Tone;
}[] = [
  {
    title: "Custos sob Controle",
    description:
      "Custos de combustível, manutenção e multas reunidos no mesmo painel, por veículo",
    icon: Wallet,
    tone: "f",
  },
  {
    title: "Controle Multi-Filiais",
    description:
      "Gerencie múltiplas filiais em uma única plataforma com segurança segmentada de dados",
    icon: Building2,
    tone: "x",
  },
  {
    title: "Gestão de Combustível",
    description:
      "Controle abastecimentos, quilometragem e custos por litro automaticamente",
    icon: Fuel,
    tone: "f",
  },
  {
    title: "Gestão de Entregas",
    description:
      "Rotas do dia, comprovante com foto do canhoto e assinatura, e ocorrências registradas pelo app do motorista",
    icon: PackageCheck,
    tone: "d",
  },
];

const OFFER: {
  title: string;
  dots: ("f" | "d")[];
  check: string;
  items: string[];
}[] = [
  {
    title: "Frotas",
    dots: ["f"],
    check: "text-[#a78bfa]",
    items: [
      "Gestão completa de ordens de serviço",
      "Controle de combustível e manutenções",
      "Gestão de multas e documentos",
      "Gestão de motoristas e documentação",
    ],
  },
  {
    title: "Entregas",
    dots: ["d"],
    check: "text-[#f0558e]",
    items: [
      "Rotas, entregas e ocorrências no app do motorista",
      "Comprovante de entrega com foto, assinatura e QR code",
      "Torre de controle das entregas do dia",
      "Integração com WhatsApp para notificações",
    ],
  },
  {
    title: "Em qualquer módulo",
    dots: ["f", "d"],
    check: "text-[#e5e7eb]",
    items: [
      "Controle de usuários com autenticação 2FA",
      "Gerencie múltiplas filiais em uma única plataforma",
      "Controle granular de permissões por usuário",
      "Exportação de relatórios em Excel e CSV",
      "Dashboards com métricas essenciais",
      "Histórico de atividades da empresa",
    ],
  },
];

const CONTACT_FIELDS: {
  label: string;
  name: "name" | "company" | "email" | "telephone";
  placeholder: string;
  type: string;
  autoComplete: string;
  inputMode: "text" | "email" | "tel";
  maxLength: number;
  icon: LucideIcon;
}[] = [
  {
    label: "Nome completo *",
    name: "name",
    placeholder: "Seu nome completo",
    type: "text",
    autoComplete: "name",
    inputMode: "text",
    maxLength: QUOTE_LIMITS.name,
    icon: User,
  },
  {
    label: "Empresa *",
    name: "company",
    placeholder: "Nome da empresa",
    type: "text",
    autoComplete: "organization",
    inputMode: "text",
    maxLength: QUOTE_LIMITS.company,
    icon: Building2,
  },
  {
    label: "E-mail *",
    name: "email",
    placeholder: "seu@email.com",
    type: "email",
    autoComplete: "email",
    inputMode: "email",
    maxLength: QUOTE_LIMITS.email,
    icon: Mail,
  },
  {
    label: "Telefone *",
    name: "telephone",
    placeholder: "(00) 00000-0000",
    type: "tel",
    autoComplete: "tel",
    inputMode: "tel",
    // "(00) 00000-0000"
    maxLength: 15,
    icon: Phone,
  },
];

/** Shown only when scripting is off: all steps at once (the server HTML's own fallback). */
const NO_SCRIPT_ONLY = "hidden [@media(scripting:none)]:inline";
const SCRIPT_ONLY = "[@media(scripting:none)]:hidden";

interface QuoteFieldsProps {
  state: CreateQuoteFormState;
  step: QuoteStep;
  values: QuoteValues;
  /** Client and server messages per field (server ones clear on edit). */
  live: LiveValidation;
  onChange: (field: keyof QuoteValues, value: string) => void;
  onGoTo: (step: QuoteStep) => void;
  animate: string;
}

const QuoteFields = ({
  state,
  step,
  values,
  live,
  onChange,
  onGoTo,
  animate,
}: QuoteFieldsProps): JSX.Element => {
  const { pending } = useFormStatus();

  // The token lives with the widget, which only exists on step 3: leaving
  // the step unmounts it and drops its token, so coming back waits for a
  // new one instead of treating the loading box as valid.
  const captcha = useCaptchaToken();
  const resetCaptcha = captcha.reset;
  const captchaMissing = step === 3 && captcha.missing;

  // A new widget whenever the API answered with a message (the token was
  // sent and verified there); field errors leave it unused.
  useEffect(() => {
    if (quoteConsumedCaptcha(state)) resetCaptcha();
  }, [state, resetCaptcha]);

  const errorOf = (field: QuoteFieldName) => live.messageOf(field);
  const fleetError = errorOf("fleet_size");
  const fleetLabel =
    FLEET_SIZES.find((size) => size.value === values.fleet_size)?.label ?? "—";

  const panel = (n: QuoteStep) =>
    cn(
      "flex flex-col",
      step !== n && "[@media(scripting:enabled)]:hidden",
      step === n && animate,
    );

  const summary: { key: string; value: string; step: QuoteStep }[] = [
    { key: "Frota", value: fleetLabel, step: 1 },
    {
      key: "Contato",
      value: [values.name, values.company].filter(Boolean).join(" · ") || "—",
      step: 2,
    },
    {
      key: "Retorno",
      value:
        [values.email, values.telephone].filter(Boolean).join(" · ") || "—",
      step: 2,
    },
  ];

  return (
    <>
      {/* Etapa 1 · Operação */}
      <div className={cn(panel(1), "gap-[22px]")}>
        <fieldset
          id="fleet_size"
          role="radiogroup"
          aria-required="true"
          aria-invalid={fleetError ? true : undefined}
          aria-describedby={fleetError ? "fleet_size-error" : undefined}
          className="m-0 min-w-0 border-0 p-0"
        >
          <legend className="mb-3 p-0 text-sm font-medium">
            <SiteLabelText label="Tamanho da frota *" />
          </legend>
          <div
            className={cn(
              "grid grid-cols-[repeat(auto-fit,minmax(118px,1fr))] gap-2 max-[359px]:grid-cols-2",
              live.shakeOf("fleet_size") && "animate-tp-shake",
            )}
          >
            {FLEET_SIZES.map((size) => (
              <label key={size.value} className="relative block cursor-pointer">
                <input
                  type="radio"
                  name="fleet_size"
                  value={size.value}
                  checked={values.fleet_size === size.value}
                  onChange={() => onChange("fleet_size", size.value)}
                  disabled={pending}
                  aria-label={size.label}
                  className="peer sr-only"
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex flex-col items-start gap-0.5 rounded-[13px] border px-3.5 py-3 transition-[background-color,border-color,color,transform] duration-200 active:scale-[.97]",
                    "border-site-line2 text-site-ink hover:bg-site-soft",
                    "peer-checked:border-site-ink peer-checked:bg-site-ink peer-checked:text-site-bg",
                    "peer-focus-visible:ring-2 peer-focus-visible:ring-site-ink/40 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-site-surface",
                    fleetError && "border-red-600 dark:border-red-400",
                  )}
                >
                  <span className="font-site-display text-xl leading-[1.1] tracking-[-.02em]">
                    {size.short}
                  </span>
                  <span className="text-xs leading-[1.5] opacity-75">
                    veículos
                  </span>
                </span>
              </label>
            ))}
          </div>
          <SiteFieldError
            id="fleet_size-error"
            message={fleetError}
            className="mt-2.5"
          />
        </fieldset>
      </div>

      {/* Etapa 2 · Contato */}
      <div
        className={cn(
          panel(2),
          "grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4",
        )}
      >
        {CONTACT_FIELDS.map((field) => {
          const Icon = field.icon;
          const error = errorOf(field.name);
          // The tick means what the server will accept, not a looser guess.
          const complete =
            !error &&
            values[field.name].trim() !== "" &&
            live.isFieldValid(field.name);

          return (
            <SiteField
              key={field.name}
              label={field.label}
              htmlFor={field.name}
              error={error}
            >
              {(control) => (
                <div
                  className={cn(
                    "relative flex items-center",
                    live.shakeOf(field.name) && "animate-tp-shake",
                  )}
                >
                  <Icon
                    aria-hidden
                    className="pointer-events-none absolute left-[15px] size-[17px] text-site-muted"
                  />
                  <input
                    {...control}
                    name={field.name}
                    type={field.type}
                    autoComplete={field.autoComplete}
                    inputMode={field.inputMode}
                    maxLength={field.maxLength}
                    placeholder={field.placeholder}
                    value={values[field.name]}
                    onChange={(event) =>
                      onChange(
                        field.name,
                        field.name === "telephone"
                          ? formatPhone(event.target.value)
                          : event.target.value,
                      )
                    }
                    disabled={pending}
                    className={siteInputClass({
                      invalid: !!error,
                      className: "h-[52px] pl-11 pr-11",
                    })}
                  />
                  {complete ? (
                    <span
                      aria-hidden
                      className="absolute right-3.5 flex size-5 animate-[tpPop_.35s_ease_both] items-center justify-center rounded-full bg-emerald-500 text-white"
                    >
                      <Check className="size-[11px]" strokeWidth={3.4} />
                    </span>
                  ) : null}
                </div>
              )}
            </SiteField>
          );
        })}
      </div>

      {/* Etapa 3 · Detalhes */}
      <div className={cn(panel(3), "gap-[18px]")}>
        <SiteField
          label="Mensagem (opcional)"
          htmlFor="message"
          error={errorOf("message")}
          aside={
            <CharCounter
              length={values.message.length}
              max={QUOTE_LIMITS.message}
            />
          }
        >
          {(control) => (
            <textarea
              {...control}
              name="message"
              maxLength={QUOTE_LIMITS.message}
              placeholder="Conte-nos mais sobre suas necessidades..."
              value={values.message}
              onChange={(event) => onChange("message", event.target.value)}
              disabled={pending}
              className={siteInputClass({
                invalid: !!errorOf("message"),
                className:
                  "min-h-[120px] resize-none px-4 py-3.5 leading-[1.55]",
              })}
            />
          )}
        </SiteField>

        <div
          className={cn(
            "rounded-2xl border border-site-line bg-site-soft px-[18px] py-4",
            SCRIPT_ONLY,
          )}
        >
          <Eyebrow size="sm" className="mb-2.5 tracking-[.14em]">
            RESUMO DO PEDIDO
          </Eyebrow>
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-[18px] gap-y-2 text-sm">
            {summary.map((row) => (
              <div key={row.key} className="contents">
                <dt className="whitespace-nowrap text-site-muted">{row.key}</dt>
                <dd className="m-0 flex min-w-0 justify-between gap-2.5 font-medium [overflow-wrap:anywhere]">
                  <span className="min-w-0">{row.value}</span>
                  <button
                    type="button"
                    onClick={() => onGoTo(row.step)}
                    disabled={pending}
                    aria-label={`Editar ${row.key.toLowerCase()}`}
                    className="shrink-0 rounded-sm text-[13px] font-normal text-site-muted underline underline-offset-2 outline-none hover:text-site-ink focus-visible:ring-2 focus-visible:ring-site-ink/40"
                  >
                    Editar
                  </button>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <SitePrivacyNotice id={QUOTE_PRIVACY_NOTICE_ID} tone="plain">
          Usamos estes dados para responder ao seu pedido de orçamento e dar
          andamento à proposta. Saiba mais na
        </SitePrivacyNotice>

        {state?.createQuoteError?.createQuoteErrorMessage ? (
          <p
            role="alert"
            className="m-0 flex gap-2.5 rounded-xl border border-red-500/30 bg-red-500/[.08] px-3.5 py-3 text-sm text-red-700 dark:text-red-300"
          >
            <ShieldAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span className="break-words">
              {state.createQuoteError.createQuoteErrorMessage}
            </span>
          </p>
        ) : null}

        {captcha.required && step === 3 ? (
          <>
            <CaptchaTurnstile
              {...captcha.widget}
              className="!mt-0"
              size="flexible"
              // Under 300 px of card (phones up to ~380 px wide).
              fallbackSize="compact"
            />
            <input
              type="hidden"
              name="turnstileToken"
              value={captcha.token ?? ""}
            />
          </>
        ) : null}
      </div>

      <div className="flex items-center gap-2.5">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => onGoTo((step - 1) as QuoteStep)}
            disabled={pending}
            aria-label="Voltar"
            className={cn(
              "flex size-14 shrink-0 items-center justify-center rounded-[15px] border border-site-line2 outline-none transition-colors hover:bg-site-soft focus-visible:ring-2 focus-visible:ring-site-ink/40 disabled:opacity-60",
              SCRIPT_ONLY,
            )}
          >
            <ArrowLeft aria-hidden className="size-[18px]" />
          </button>
        ) : null}
        <button
          type="submit"
          // Read with the button, right before sending (and, while the
          // captcha holds it back, why).
          aria-describedby={
            captchaMissing && captcha.describedBy
              ? `${QUOTE_PRIVACY_NOTICE_ID} ${captcha.describedBy}`
              : QUOTE_PRIVACY_NOTICE_ID
          }
          disabled={pending || captchaMissing}
          className={siteButtonClass({
            className:
              "h-14 flex-1 rounded-[15px] text-base active:scale-[.985]",
          })}
        >
          {pending ? (
            <>
              Enviando…
              <Loader2 aria-hidden className="size-[18px] animate-tp-spin" />
            </>
          ) : step === 3 ? (
            <>
              Solicitar Orçamento
              <Send aria-hidden className="size-[18px]" />
            </>
          ) : (
            <>
              <span className={SCRIPT_ONLY}>Continuar</span>
              <span className={NO_SCRIPT_ONLY}>Solicitar Orçamento</span>
              <MovingArrow className={SCRIPT_ONLY} />
            </>
          )}
        </button>
      </div>
      <p className="-mt-2 mb-0 text-center text-[13px] text-site-muted">
        Preencha o formulário e nossa equipe entrará em contato em até 24 horas.
      </p>
    </>
  );
};

const QuoteSuccess = ({
  fleet,
  onReset,
}: {
  fleet: string;
  onReset: () => void;
}): JSX.Element => (
  <div
    role="status"
    className="flex min-h-[min(560px,70vh)] animate-[tpUp_.6s_cubic-bezier(.22,1,.36,1)_both] flex-col items-center justify-center gap-[18px] text-center"
  >
    <span
      aria-hidden
      className="relative flex size-[84px] items-center justify-center"
    >
      <span className="absolute inset-0 animate-[tpRing_1.4s_ease-out_.3s_both] rounded-full bg-emerald-500" />
      <span className="relative flex size-[84px] animate-tp-pop items-center justify-center rounded-full bg-emerald-500">
        <svg
          width="38"
          height="38"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path
            d="M20 6 9 17l-5-5"
            pathLength={1}
            strokeDasharray={1}
            className="animate-[tpDraw_.5s_ease-out_.35s_both]"
          />
        </svg>
      </span>
    </span>
    <h2 className="m-0 font-site-display text-[32px] font-medium tracking-[-.025em]">
      Orçamento solicitado!
    </h2>
    <p className="m-0 max-w-[400px] text-[15.5px] leading-[1.6] text-site-muted">
      Recebemos sua solicitação com sucesso. Em breve, um especialista entrará
      em contato.
    </p>
    {fleet ? (
      <div className="flex flex-wrap justify-center gap-2">
        <span className="whitespace-nowrap rounded-full bg-site-soft2 px-3 py-1.5 text-[13px]">
          {fleet}
        </span>
      </div>
    ) : null}
    <button
      type="button"
      onClick={onReset}
      className="mt-1.5 min-h-11 rounded-[13px] border border-site-line2 px-[18px] py-3 font-medium outline-none transition-colors hover:bg-site-soft focus-visible:ring-2 focus-visible:ring-site-ink/40"
    >
      Enviar outro orçamento
    </button>
  </div>
);

const QuoteForm = (): JSX.Element => {
  const [state, dispatch] = useFormState(handleQuoteSubmit, null);
  const { formRef, handleReset } = useQuoteForm(dispatch);

  const [values, setValues] = useState<QuoteValues>(EMPTY_QUOTE);
  const [step, setStep] = useState<QuoteStep>(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [moved, setMoved] = useState(false);
  const focusAfterMove = useRef<string | null>(null);

  const serverErrors = (state as CreateQuoteFormState | null)?.createQuoteError;

  const live = useLiveValidation({
    schema: quoteSchema,
    values,
    fields: FIELD_ORDER,
    serverErrors,
    // The steps decide what a submit checks (onSubmit below).
    validateOnSubmit: false,
  });

  // Stable, so the listeners are not re-attached on every keystroke.
  const bindLive = live.ref;
  const bindForm = useCallback(
    (element: HTMLFormElement | null) => {
      formRef.current = element;
      bindLive(element);
    },
    [formRef, bindLive],
  );

  const goTo = (next: QuoteStep, focusId?: string) => {
    setDirection(next > step ? 1 : -1);
    setMoved(true);
    setStep(next);
    focusAfterMove.current = focusId ?? null;
  };

  // Focus lands on the step's first control once it is shown.
  useEffect(() => {
    const id = focusAfterMove.current;
    if (!id) return;
    focusAfterMove.current = null;
    const element =
      id === "fleet_size"
        ? document.querySelector<HTMLInputElement>(
            'input[name="fleet_size"]:checked, input[name="fleet_size"]',
          )
        : document.getElementById(id);
    element?.focus({ preventScroll: true });
  }, [step]);

  // A server answer with field errors: back to the first step concerned.
  useEffect(() => {
    const first = FIELD_ORDER.find((field) => serverErrors?.[field]?.length);
    if (first) goTo(FIELD_STEP[first], first);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const onChange = (field: keyof QuoteValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    // A choice is a finished answer: the fleet size needs no blur to count.
    if (field === "fleet_size") live.touch(field);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    // Every step up to this one must pass its checks; the last step submits
    // (the server action runs only if this does not prevent the event).
    // validate() shows the step's messages and focuses its first invalid
    // field once that step is on screen.
    for (const at of [1, 2, 3] as const) {
      if (at > step) break;
      if (!live.validate(STEP_FIELDS[at])) {
        event.preventDefault();
        if (at !== step) goTo(at);
        return;
      }
    }

    if (step < 3) {
      event.preventDefault();
      goTo((step + 1) as QuoteStep, step === 1 ? "name" : "message");
    }
  };

  const reset = () => {
    handleReset();
    setValues(EMPTY_QUOTE);
    live.reset();
    setMoved(false);
    setStep(1);
  };

  const animate =
    moved && !reducedMotion()
      ? direction > 0
        ? "animate-[tpFwd_.45s_cubic-bezier(.22,1,.36,1)_both]"
        : "animate-[tpBack_.45s_cubic-bezier(.22,1,.36,1)_both]"
      : "";

  const fleetLabel =
    FLEET_SIZES.find((size) => size.value === values.fleet_size)?.label ?? "";
  const michael = partner("michael");
  const jomar = partner("jomar");

  return (
    <>
      <section
        aria-labelledby="orc-titulo"
        className="relative overflow-hidden px-[clamp(20px,4vw,40px)] pb-[clamp(64px,8vw,104px)] pt-[clamp(116px,14vh,156px)]"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_45%_at_10%_15%,var(--site-glow-a),transparent_70%),radial-gradient(40%_45%_at_92%_75%,var(--site-glow-b),transparent_70%)]"
        />
        <div className="relative mx-auto grid max-w-[1200px] grid-cols-[repeat(auto-fit,minmax(min(100%,440px),1fr))] items-start gap-[clamp(40px,6vw,88px)]">
          <div className="top-[120px] flex min-w-0 flex-col gap-[30px] min-[980px]:sticky">
            <div className="flex animate-[tpUp_.8s_cubic-bezier(.22,1,.36,1)_both] flex-col gap-5">
              <Eyebrow>SOLICITAR ORÇAMENTO</Eyebrow>
              <SectionHeading
                id="orc-titulo"
                as="h1"
                className="text-[clamp(42px,5.4vw,74px)] leading-[.98] tracking-[-.045em]"
              >
                Transforme a gestão da sua frota e das suas entregas.
              </SectionHeading>
              <p className="m-0 max-w-[520px] text-[clamp(17px,1.4vw,19px)] leading-[1.6] text-site-muted [text-wrap:pretty]">
                Solicite um orçamento personalizado e veja como o Trajetto
                organiza a sua operação, do veículo ao comprovante de entrega.
              </p>
            </div>
            <ul className="m-0 grid animate-[tpUp_.8s_cubic-bezier(.22,1,.36,1)_.1s_both] list-none grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-x-7 gap-y-0.5 p-0">
              {BENEFITS.map(({ title, description, icon: Icon, tone }) => (
                <li
                  key={title}
                  className="flex gap-3.5 border-t border-site-line py-4"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-[38px] shrink-0 items-center justify-center rounded-[11px]",
                      TONE[tone],
                    )}
                  >
                    <Icon className="size-[18px]" />
                  </span>
                  <div className="min-w-0">
                    <p className="m-0 text-[15px] font-semibold">{title}</p>
                    <p className="m-0 mt-[3px] text-[13.5px] leading-[1.5] text-site-muted">
                      {description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex animate-[tpUp_.8s_cubic-bezier(.22,1,.36,1)_.18s_both] items-center gap-3 text-sm text-site-muted">
              <div className="flex shrink-0">
                {[jomar, michael].map((person, index) => (
                  <Image
                    key={person.id}
                    src={person.photo}
                    alt=""
                    width={34}
                    height={34}
                    sizes="34px"
                    className={cn(
                      "size-[34px] rounded-full border-2 border-site-bg object-cover",
                      index && "-ml-2.5",
                    )}
                  />
                ))}
              </div>
              <span>A proposta é montada pela própria equipe do Trajetto.</span>
            </div>
          </div>

          <div
            id="budget"
            className="min-w-0 scroll-mt-24 animate-[tpUp_1s_cubic-bezier(.22,1,.36,1)_.12s_both]"
          >
            <div className="relative rounded-[28px] border border-site-line bg-site-surface p-[clamp(22px,3vw,36px)] shadow-[0_40px_90px_-50px_rgba(14,14,30,.45),0_12px_30px_-24px_rgba(14,14,30,.2)] dark:shadow-[0_40px_90px_-50px_rgba(0,0,0,.8)]">
              {state?.successMessage ? (
                <QuoteSuccess fleet={fleetLabel} onReset={reset} />
              ) : (
                // Named, the form is a landmark. noValidate: the checks speak
                // Portuguese and sit under each field.
                <form
                  ref={bindForm}
                  action={dispatch}
                  onSubmit={onSubmit}
                  noValidate
                  aria-labelledby={QUOTE_FORM_TITLE_ID}
                  className="flex flex-col gap-6"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <h2
                        id={QUOTE_FORM_TITLE_ID}
                        className="m-0 font-site-display text-[clamp(24px,2.4vw,30px)] font-medium tracking-[-.025em]"
                      >
                        Solicite seu orçamento
                      </h2>
                      <span
                        aria-live="polite"
                        className={cn(
                          "whitespace-nowrap font-site-mono text-xs text-site-muted",
                          SCRIPT_ONLY,
                        )}
                      >
                        Etapa {step} de 3
                      </span>
                    </div>
                    <ol
                      aria-label="Etapas"
                      className={cn(
                        "m-0 grid list-none grid-cols-3 gap-2 p-0",
                        SCRIPT_ONLY,
                      )}
                    >
                      {STEP_TITLES.map((title, index) => {
                        const n = (index + 1) as QuoteStep;
                        const on = n === step;
                        const done = n < step;

                        return (
                          <li
                            key={title}
                            aria-current={on ? "step" : undefined}
                          >
                            <button
                              type="button"
                              onClick={() => done && goTo(n)}
                              disabled={!done}
                              className="flex w-full flex-col gap-2 rounded-sm bg-transparent p-0 pb-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-site-ink/40 enabled:cursor-pointer disabled:cursor-default"
                            >
                              <span className="relative block h-1 overflow-hidden rounded-full bg-site-line2">
                                <span
                                  className={cn(
                                    "absolute inset-0 origin-left rounded-full bg-site-ink transition-transform [transition-duration:600ms] ease-site",
                                    n <= step ? "scale-x-100" : "scale-x-0",
                                  )}
                                />
                              </span>
                              <span
                                className={cn(
                                  "flex items-center gap-1.5 whitespace-nowrap text-[13px] transition-colors duration-300",
                                  on
                                    ? "font-semibold text-site-ink"
                                    : done
                                      ? "font-medium text-site-ink"
                                      : "font-medium text-site-muted",
                                )}
                              >
                                {done ? (
                                  <span
                                    aria-hidden
                                    className="flex size-4 animate-[tpPop_.35s_ease_both] items-center justify-center rounded-full bg-emerald-500 text-white"
                                  >
                                    <Check
                                      className="size-[11px]"
                                      strokeWidth={3.4}
                                    />
                                  </span>
                                ) : null}
                                {title}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                  </div>

                  <QuoteFields
                    state={state ?? {}}
                    step={step}
                    values={values}
                    live={live}
                    onChange={onChange}
                    onGoTo={(next) =>
                      goTo(
                        next,
                        next === 1
                          ? "fleet_size"
                          : next === 2
                            ? "name"
                            : "message",
                      )
                    }
                    animate={animate}
                  />
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="oferta-titulo"
        className={cn(
          "relative overflow-hidden bg-[#0b0b10] px-[clamp(20px,4vw,40px)] py-[clamp(80px,11vw,140px)]",
          DARK_BAND.ink,
        )}
      >
        <DarkGrid />
        <div className="relative mx-auto max-w-[1200px]">
          <Reveal className="max-w-[680px]">
            <Eyebrow tone="dark-band" className="mb-4">
              O QUE OFERECEMOS
            </Eyebrow>
            <SectionHeading
              id="oferta-titulo"
              className="text-[clamp(34px,4.6vw,62px)] leading-[1.02]"
            >
              O que entra na sua proposta.
            </SectionHeading>
          </Reveal>
          <div className="mt-[clamp(40px,6vw,64px)] grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-4">
            {OFFER.map((group, index) => (
              <Reveal
                key={group.title}
                delay={index * 90}
                className="rounded-3xl border border-white/[.08] bg-[#121218] p-[26px]"
              >
                <h3 className="m-0 mb-4 flex items-center gap-2.5 text-[15px] font-semibold">
                  <span aria-hidden className="flex gap-[3px]">
                    {group.dots.includes("f") ? (
                      <span className="size-[9px] rounded-[2px] bg-[#9b7dff]" />
                    ) : null}
                    {group.dots.includes("d") ? (
                      <span className="size-[9px] rounded-full bg-[#f0558e]" />
                    ) : null}
                  </span>
                  {group.title}
                </h3>
                <ul className="m-0 list-none p-0">
                  {group.items.map((item) => (
                    <li
                      key={item}
                      className={cn(
                        "flex gap-2.5 border-t border-white/[.07] py-2.5 text-[14.5px] leading-[1.45]",
                        DARK_BAND.soft,
                      )}
                    >
                      <Check
                        aria-hidden
                        strokeWidth={2.4}
                        className={cn("mt-0.5 size-4 shrink-0", group.check)}
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export { QuoteForm };
