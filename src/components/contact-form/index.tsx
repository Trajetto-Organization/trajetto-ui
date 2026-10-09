"use client";

import { useEffect, useState } from "react";

import {
  Check,
  ClipboardCheck,
  Clock,
  Copy,
  FileCheck,
  Fuel,
  Globe,
  LayoutGrid,
  Loader2,
  Mail,
  MessageCircle,
  Send,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import { Eyebrow, SectionHeading } from "@/components/site/primitives";
import { siteButtonClass } from "@/components/site/arrow-link";
import { reducedMotion } from "@/components/site/institutional/motion";
import {
  CharCounter,
  SiteField,
  SitePrivacyNotice,
  siteInputClass,
} from "@/components/site/institutional/form-field";
import { SupportStatusPill } from "@/components/site/institutional/support-status";
import { cn } from "@/lib/utils";

import { useContact } from "./hooks";
import { CONTACT_EMAIL, CONTACT_LIMITS } from "./contact-message";

/**
 * /contact, above the fold (design: Trajetto Contato): the channels and a
 * rotating card of what the product does on the left, the message form on
 * the right. The form only opens the person's mail program (contact-message
 * and its hook hold that logic); nothing is sent from here.
 */

const PRIVACY_NOTICE_ID = "contact-privacy-notice";
const FORM_TITLE_ID = "contact-form-title";

/** How long each highlight stays, as in the design. */
const HIGHLIGHT_MS = 7_000;

type Tone = "f" | "d" | "x";

const TONE: Record<Tone, string> = {
  f: "bg-site-violet-soft text-site-violet",
  d: "bg-site-pink-soft text-site-pink",
  x: "bg-site-soft2 text-site-ink",
};

// Features the product ships today, in place of made-up testimonials: until
// there is a real case to tell, the product speaks.
const HIGHLIGHTS: {
  quote: string;
  name: string;
  role: string;
  icon: LucideIcon;
  tone: Tone;
}[] = [
  {
    quote:
      "Inspeção veicular com foto obrigatória, localização e assinatura — preenchida direto no celular, mesmo sem sinal no pátio.",
    name: "Checklist em campo",
    role: "Aplicativo Android",
    icon: ClipboardCheck,
    tone: "f",
  },
  {
    quote:
      "Abastecimento registrado com foto do odômetro e cálculo automático de custo, sem planilha e sem digitação em duplicidade.",
    name: "Controle de combustível",
    role: "App e painel web",
    icon: Fuel,
    tone: "f",
  },
  {
    quote:
      "Cada empresa enxerga apenas os próprios dados, com perfis de acesso e permissões definidos por você para cada função.",
    name: "Multi-empresa e permissões",
    role: "Segurança de acesso",
    icon: ShieldCheck,
    tone: "x",
  },
  {
    quote:
      "Ordens de serviço, manutenções, multas e contas a pagar reunidas no mesmo lugar, com histórico por veículo e por motorista.",
    name: "Gestão completa da frota",
    role: "Painel web",
    icon: LayoutGrid,
    tone: "f",
  },
  {
    quote:
      "Rotas do dia no app do motorista, com foto do canhoto, assinatura e comprovante em PDF que o destinatário confere pelo QR code.",
    name: "Comprovante de entrega",
    role: "App e painel web",
    icon: FileCheck,
    tone: "d",
  },
];

/** Topic chips: a shortcut that fills the subject (still editable). */
const TOPICS: { label: string; subject: string; dots: ("f" | "d")[] }[] = [
  {
    label: "Gestão de Frotas",
    subject: "Quero conhecer a Gestão de Frotas",
    dots: ["f"],
  },
  {
    label: "Gestão de Entregas",
    subject: "Quero conhecer a Gestão de Entregas",
    dots: ["d"],
  },
  {
    label: "Os dois módulos",
    subject: "Quero conhecer Frotas e Entregas",
    dots: ["f", "d"],
  },
  {
    label: "Demonstração",
    subject: "Quero agendar uma demonstração",
    dots: [],
  },
  { label: "Suporte", subject: "Preciso de ajuda com a plataforma", dots: [] },
];

const [EMAIL_LOCAL, EMAIL_DOMAIN] = CONTACT_EMAIL.split("@");

const CHANNEL_ICON =
  "flex size-11 shrink-0 items-center justify-center rounded-[13px] border border-site-line bg-site-surface";

const CopyEmailButton = (): JSX.Element => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1_800);

    return () => clearTimeout(timer);
  }, [copied]);

  const copy = () => {
    const done = () => setCopied(true);
    try {
      navigator.clipboard.writeText(CONTACT_EMAIL).then(done, done);
    } catch {
      done();
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "E-mail copiado" : "Copiar e-mail"}
      className="inline-flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[10px] border border-site-line2 px-3 py-2 text-[13px] font-medium outline-none transition-colors hover:bg-site-surface focus-visible:ring-2 focus-visible:ring-site-ink/40"
    >
      {copied ? (
        <Check
          aria-hidden
          strokeWidth={2.6}
          className="size-3.5 animate-tp-pop text-emerald-600 dark:text-emerald-400"
        />
      ) : (
        <Copy aria-hidden className="size-3.5" />
      )}
      <span aria-live="polite">{copied ? "Copiado" : "Copiar"}</span>
    </button>
  );
};

const Highlights = (): JSX.Element => {
  const [current, setCurrent] = useState(0);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (reducedMotion()) return;
    const timer = setInterval(
      () => setCurrent((index) => (index + 1) % HIGHLIGHTS.length),
      HIGHLIGHT_MS,
    );

    return () => clearInterval(timer);
  }, [cycle]);

  return (
    <div className="relative animate-[tpUp_.8s_cubic-bezier(.22,1,.36,1)_.2s_both] rounded-[22px] border border-site-line bg-site-surface px-[22px] pb-3 pt-[22px]">
      <Eyebrow size="sm" className="mb-3.5 tracking-[.14em]">
        O QUE O TRAJETTO JÁ FAZ
      </Eyebrow>
      <div className="grid">
        {HIGHLIGHTS.map((item, index) => {
          const on = index === current;
          const Icon = item.icon;

          return (
            <div
              key={item.name}
              aria-hidden={!on}
              className={cn(
                "flex flex-col gap-3.5 [grid-area:1/1] transition-[opacity,transform,visibility] duration-500 ease-site",
                on
                  ? "visible opacity-100"
                  : "invisible translate-y-2.5 opacity-0",
              )}
            >
              <p className="m-0 text-[15.5px] leading-[1.6] [text-wrap:pretty]">
                {item.quote}
              </p>
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className={cn(
                    "flex size-9 items-center justify-center rounded-[11px]",
                    TONE[item.tone],
                  )}
                >
                  <Icon className="size-[17px]" />
                </span>
                <div>
                  <p className="m-0 text-sm font-semibold">{item.name}</p>
                  <p className="m-0 text-[13px] text-site-muted">{item.role}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-1.5">
        {HIGHLIGHTS.map((item, index) => {
          const on = index === current;

          return (
            <button
              key={item.name}
              type="button"
              aria-label={item.name}
              aria-pressed={on}
              onClick={() => {
                setCurrent(index);
                setCycle((value) => value + 1);
              }}
              className="group/dot flex h-6 items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-site-ink/40"
            >
              <span
                className={cn(
                  "relative block h-1 overflow-hidden rounded-full bg-site-line2 transition-[width] [transition-duration:400ms] ease-site",
                  on ? "w-8" : "w-3 group-hover/dot:bg-site-muted/50",
                )}
              >
                {on ? (
                  <span
                    key={`${current}-${cycle}`}
                    className="absolute inset-0 origin-left animate-[tpProgress_7s_linear_both] rounded-full bg-site-ink motion-reduce:animate-none"
                  />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const ContactForm = (): JSX.Element => {
  const {
    formRef,
    values,
    errors,
    isOpening,
    wasOpened,
    fieldIds,
    shakeOf,
    handleChange,
    handleSubmit,
  } = useContact();

  const topic = TOPICS.findIndex((item) => item.subject === values.subject);

  return (
    <section
      aria-labelledby="contato-titulo"
      className="relative overflow-hidden px-[clamp(20px,4vw,40px)] pb-[clamp(64px,8vw,104px)] pt-[clamp(120px,15vh,160px)]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_45%_at_12%_18%,var(--site-glow-a),transparent_70%),radial-gradient(40%_45%_at_92%_70%,var(--site-glow-b),transparent_70%)]"
      />
      <div className="relative mx-auto grid max-w-[1200px] grid-cols-[repeat(auto-fit,minmax(min(100%,440px),1fr))] items-start gap-[clamp(40px,6vw,88px)]">
        {/* Channels */}
        <div className="flex min-w-0 flex-col gap-7">
          <div className="flex animate-[tpUp_.8s_cubic-bezier(.22,1,.36,1)_both] flex-col gap-5">
            <Eyebrow>CONTATO</Eyebrow>
            <SectionHeading
              id="contato-titulo"
              as="h1"
              className="text-[clamp(44px,5.6vw,76px)] leading-[.98] tracking-[-.045em]"
            >
              Vamos conversar sobre a sua operação.
            </SectionHeading>
            <p className="m-0 max-w-[520px] text-[clamp(17px,1.4vw,19px)] leading-[1.6] text-site-muted [text-wrap:pretty]">
              Estamos prontos para responder suas dúvidas e ajudar sua empresa a
              organizar a gestão de frotas e de entregas.
            </p>
            <SupportStatusPill />
          </div>

          <ul className="m-0 list-none animate-[tpUp_.8s_cubic-bezier(.22,1,.36,1)_.1s_both] border-t border-site-line p-0">
            <li className="flex items-center gap-4 border-b border-site-line py-[18px]">
              <span aria-hidden className={CHANNEL_ICON}>
                <Mail className="size-[19px]" />
              </span>
              {/* The address the form writes to, from the same constant.
                  inline-block: the hit area is the text only, not the empty
                  row up to the copy button (a block link took that gap). */}
              <div className="min-w-0 flex-1">
                <p className="m-0 text-[13px] text-site-muted">E-mail</p>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  data-contact-email
                  className="inline-block max-w-full align-top rounded-sm font-semibold outline-none [overflow-wrap:break-word] hover:underline hover:underline-offset-[3px] focus-visible:ring-2 focus-visible:ring-site-ink/40"
                >
                  {/* A narrow phone wraps after the "@", not mid-domain. */}
                  {EMAIL_LOCAL}@<wbr />
                  {EMAIL_DOMAIN}
                </a>
              </div>
              <CopyEmailButton />
            </li>
            <li className="flex items-center gap-4 border-b border-site-line py-[18px]">
              <span aria-hidden className={CHANNEL_ICON}>
                <MessageCircle className="size-[19px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="m-0 text-[13px] text-site-muted">WhatsApp</p>
                <p className="m-0 font-semibold">Em breve</p>
              </div>
              <span className="shrink-0 rounded-full bg-site-soft2 px-2.5 py-1 font-site-mono text-[10.5px] tracking-[.1em] text-site-muted">
                A DEFINIR
              </span>
            </li>
            <li className="flex items-center gap-4 border-b border-site-line py-[18px]">
              <span aria-hidden className={CHANNEL_ICON}>
                <Globe className="size-[19px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="m-0 text-[13px] text-site-muted">Atendimento</p>
                <p className="m-0 font-semibold">
                  100% digital, em todo o Brasil
                </p>
              </div>
            </li>
            <li className="flex items-center gap-4 border-b border-site-line py-[18px]">
              <span aria-hidden className={CHANNEL_ICON}>
                <Clock className="size-[19px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="m-0 text-[13px] text-site-muted">
                  Horário de Atendimento
                </p>
                <p className="m-0 font-semibold">Seg-Sex: 09:00 - 18:00</p>
              </div>
            </li>
          </ul>

          <Highlights />
        </div>

        {/* Form */}
        <div className="relative min-w-0 animate-[tpUp_1s_cubic-bezier(.22,1,.36,1)_.12s_both]">
          <div className="relative rounded-[28px] border border-site-line bg-site-surface p-[clamp(22px,3vw,36px)] shadow-[0_40px_90px_-50px_rgba(14,14,30,.45),0_12px_30px_-24px_rgba(14,14,30,.2)] dark:shadow-[0_40px_90px_-50px_rgba(0,0,0,.8)]">
            {/* noValidate: the checks speak Portuguese and sit under each field.
                Named, the form is a landmark. */}
            <form
              ref={formRef}
              noValidate
              onSubmit={handleSubmit}
              aria-labelledby={FORM_TITLE_ID}
              className="flex flex-col gap-[22px]"
            >
              <div>
                <h2
                  id={FORM_TITLE_ID}
                  className="m-0 font-site-display text-[clamp(26px,2.6vw,32px)] font-medium tracking-[-.025em]"
                >
                  Envie-nos uma mensagem
                </h2>
                <p className="m-0 mt-1.5 text-[15px] text-site-muted">
                  Preencha o formulário abaixo e retornaremos o mais rápido
                  possível.
                </p>
              </div>

              <fieldset className="m-0 flex min-w-0 flex-col gap-2.5 border-0 p-0">
                <legend className="mb-2.5 p-0 text-sm font-medium">
                  Sobre o que você quer falar?
                </legend>
                <div className="flex flex-wrap gap-2">
                  {TOPICS.map((item, index) => {
                    const on = index === topic;

                    return (
                      <button
                        key={item.label}
                        type="button"
                        aria-pressed={on}
                        disabled={isOpening}
                        onClick={() => handleChange("subject")(item.subject)}
                        className={cn(
                          "inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-full border px-3.5 py-[9px] text-[13.5px] font-medium outline-none",
                          "transition-[background-color,border-color,color,transform] duration-200 active:scale-[.97] focus-visible:ring-2 focus-visible:ring-site-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-site-surface",
                          on
                            ? "border-site-ink bg-site-ink text-site-bg"
                            : "border-site-line2 bg-transparent text-site-ink hover:bg-site-soft",
                        )}
                      >
                        {item.dots.includes("f") ? (
                          <span
                            aria-hidden
                            className="size-[7px] rounded-[2px] bg-site-violet"
                          />
                        ) : null}
                        {item.dots.includes("d") ? (
                          <span
                            aria-hidden
                            className="size-[7px] rounded-full bg-site-pink"
                          />
                        ) : null}
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
                <SiteField
                  label="Nome *"
                  htmlFor={fieldIds.firstName}
                  error={errors.firstName}
                >
                  {(control) => (
                    <input
                      {...control}
                      name="first_name"
                      type="text"
                      autoComplete="given-name"
                      maxLength={CONTACT_LIMITS.firstName}
                      placeholder="Seu primeiro nome"
                      value={values.firstName}
                      onChange={(event) =>
                        handleChange("firstName")(event.target.value)
                      }
                      disabled={isOpening}
                      className={siteInputClass({
                        invalid: !!control["aria-invalid"],
                        className: cn(
                          "h-[52px] px-4",
                          shakeOf("firstName") && "animate-tp-shake",
                        ),
                      })}
                    />
                  )}
                </SiteField>
                <SiteField
                  label="Sobrenome (opcional)"
                  htmlFor={fieldIds.lastName}
                  error={errors.lastName}
                >
                  {(control) => (
                    <input
                      {...control}
                      name="last_name"
                      type="text"
                      autoComplete="family-name"
                      maxLength={CONTACT_LIMITS.lastName}
                      placeholder="Seu sobrenome"
                      value={values.lastName}
                      onChange={(event) =>
                        handleChange("lastName")(event.target.value)
                      }
                      disabled={isOpening}
                      className={siteInputClass({
                        invalid: !!control["aria-invalid"],
                        className: cn(
                          "h-[52px] px-4",
                          shakeOf("lastName") && "animate-tp-shake",
                        ),
                      })}
                    />
                  )}
                </SiteField>
              </div>

              <SiteField
                label="Assunto *"
                htmlFor={fieldIds.subject}
                error={errors.subject}
              >
                {(control) => (
                  <input
                    {...control}
                    name="subject"
                    type="text"
                    maxLength={CONTACT_LIMITS.subject}
                    placeholder="Qual o assunto da sua mensagem?"
                    value={values.subject}
                    onChange={(event) =>
                      handleChange("subject")(event.target.value)
                    }
                    disabled={isOpening}
                    className={siteInputClass({
                      invalid: !!control["aria-invalid"],
                      className: cn(
                        "h-[52px] px-4",
                        shakeOf("subject") && "animate-tp-shake",
                      ),
                    })}
                  />
                )}
              </SiteField>

              <SiteField
                label="Mensagem *"
                htmlFor={fieldIds.message}
                error={errors.message}
                aside={
                  <CharCounter
                    length={values.message.length}
                    max={CONTACT_LIMITS.message}
                  />
                }
              >
                {(control) => (
                  <textarea
                    {...control}
                    name="message"
                    maxLength={CONTACT_LIMITS.message}
                    placeholder="Descreva como podemos ajudar você..."
                    value={values.message}
                    onChange={(event) =>
                      handleChange("message")(event.target.value)
                    }
                    disabled={isOpening}
                    className={siteInputClass({
                      invalid: !!control["aria-invalid"],
                      className: cn(
                        "min-h-40 resize-none px-4 py-3.5 leading-[1.55]",
                        shakeOf("message") && "animate-tp-shake",
                      ),
                    })}
                  />
                )}
              </SiteField>

              <SitePrivacyNotice id={PRIVACY_NOTICE_ID}>
                Este formulário só abre o seu programa de e-mail com a mensagem
                preenchida; nada é gravado nos nossos servidores. Saiba mais na
              </SitePrivacyNotice>

              {/* After the hand-off the form stays as typed (the person may
                  need it again if nothing opened), with the way out spelled.
                  -mt cancels the column gap while the region is empty. */}
              <div role="status" aria-live="polite" className="-mt-[22px]">
                {wasOpened ? (
                  <p className="m-0 mt-[22px] flex animate-[tpUp_.4s_cubic-bezier(.22,1,.36,1)_both] gap-2.5 rounded-[13px] border border-emerald-600/25 bg-emerald-600/[.08] px-3.5 py-3 text-[13.5px] leading-[1.55] text-site-ink">
                    <Check
                      aria-hidden
                      strokeWidth={2.6}
                      className="mt-0.5 size-4 shrink-0 text-emerald-700 dark:text-emerald-400"
                    />
                    <span>
                      Abrimos o seu programa de e-mail com a mensagem
                      preenchida. Se nada abriu, escreva para{" "}
                      <a
                        href={`mailto:${CONTACT_EMAIL}`}
                        className="font-semibold underline underline-offset-2"
                      >
                        {CONTACT_EMAIL}
                      </a>
                      .
                    </span>
                  </p>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={isOpening}
                // Read with the button, right before sending.
                aria-describedby={PRIVACY_NOTICE_ID}
                className={siteButtonClass({
                  className:
                    "h-14 w-full rounded-[15px] text-base active:scale-[.985] disabled:pointer-events-auto disabled:cursor-progress",
                })}
              >
                {isOpening ? "Abrindo o e-mail..." : "Enviar mensagem"}
                {isOpening ? (
                  <Loader2
                    aria-hidden
                    className="size-[18px] animate-tp-spin"
                  />
                ) : (
                  <Send aria-hidden className="size-[18px]" />
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export { ContactForm };
