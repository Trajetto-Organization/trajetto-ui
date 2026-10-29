import type { ReactNode } from "react";

import { Lock } from "lucide-react";
import Link from "next/link";

import {
  fieldControlProps,
  parseFieldLabel,
  type FieldControlProps,
} from "@/components/shared/custom/field-shell";
import { FORM_PRIVACY_HREF } from "@/lib/content/legal-documents";
import { cn } from "@/lib/utils";

/**
 * Form pieces of the public site's contact and quote forms (design: Trajetto
 * Contato / Orçamento). The wiring is the app's FieldShell contract
 * (`fieldControlProps`): the label points at the control, the error is
 * `<id>-error`, announced on insertion and named in `aria-describedby`, and
 * `aria-required` / `aria-invalid` sit on the control. Only the look differs.
 */

/** 52px field on the soft surface; ink border and violet halo on focus. */
const SITE_INPUT =
  "w-full rounded-[13px] border bg-site-soft text-[15px] text-site-ink outline-none placeholder:text-site-muted/80 " +
  "transition-[border-color,box-shadow,background-color] duration-200 " +
  "focus:border-site-ink focus:bg-site-surface focus:shadow-[0_0_0_4px_var(--site-violet-soft)] " +
  "disabled:cursor-not-allowed disabled:opacity-60";

function siteInputClass({
  invalid,
  className,
}: { invalid?: boolean; className?: string } = {}): string {
  return cn(
    SITE_INPUT,
    invalid ? "border-red-600 dark:border-red-400" : "border-site-line2",
    className,
  );
}

const SITE_LABEL = "text-sm font-medium text-site-ink";

/** The label text with its marker: "Nome *", "Sobrenome (opcional)" muted. */
const SiteLabelText = ({ label }: { label: string }): JSX.Element => {
  const { text, required } = parseFieldLabel(label);
  const optional = /\s*\(opcional\)$/.exec(text);

  if (optional) {
    return (
      <>
        {text.slice(0, optional.index)}{" "}
        <span className="font-normal text-site-muted">(opcional)</span>
      </>
    );
  }

  return (
    <>
      {text}
      {required ? (
        <>
          {" "}
          {/* Announced by aria-required; the star is for the eye. */}
          <span aria-hidden="true">*</span>
        </>
      ) : null}
    </>
  );
};

/** The error line under a control (or a group), announced when it appears. */
const SiteFieldError = ({
  id,
  message,
  className,
}: {
  id: string;
  message?: string | null;
  className?: string;
}) =>
  message ? (
    <p
      id={id}
      role="alert"
      className={cn(
        "m-0 animate-[tpUp_.3s_ease_both] text-[13px] leading-[1.45] text-red-600 dark:text-red-400",
        className,
      )}
    >
      {message}
    </p>
  ) : null;

interface SiteFieldProps {
  /** "Nome *" marks it required, "Sobrenome (opcional)" optional. */
  label: string;
  htmlFor: string;
  error?: string[] | string | null;
  /** Right side of the label row (a character counter). */
  aside?: ReactNode;
  className?: string;
  children: (control: FieldControlProps) => ReactNode;
}

function firstMessage(error: SiteFieldProps["error"]): string | null {
  if (!error) return null;
  if (typeof error === "string") return error.trim() || null;

  return error[0]?.trim() || null;
}

const SiteField = ({
  label,
  htmlFor,
  error,
  aside,
  className,
  children,
}: SiteFieldProps): JSX.Element => {
  const message = firstMessage(error);
  const { required } = parseFieldLabel(label);
  const control = fieldControlProps({
    htmlFor,
    message,
    required,
    hasHint: false,
  });

  return (
    // content-start: an error under one field does not stretch its neighbour in the row.
    <div className={cn("grid min-w-0 content-start gap-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className={SITE_LABEL}>
          <SiteLabelText label={label} />
        </label>
        {aside}
      </div>
      {children(control)}
      <SiteFieldError id={`${htmlFor}-error`} message={message} />
    </div>
  );
};

/** "12/1000" in mono, amber when close to the limit. */
const CharCounter = ({
  length,
  max,
}: {
  length: number;
  max: number;
}): JSX.Element => (
  <span
    aria-hidden="true"
    className={cn(
      "font-site-mono text-[11.5px] tabular-nums",
      length > max * 0.9
        ? "text-amber-700 dark:text-amber-400"
        : "text-site-muted",
    )}
  >
    {length}/{max}
  </span>
);

interface SitePrivacyNoticeProps {
  /** Referenced by the submit button's aria-describedby. */
  id: string;
  children: ReactNode;
  /** "box": soft panel (contact). "plain": text only (quote summary step). */
  tone?: "box" | "plain";
  className?: string;
}

/**
 * The notice at the point of collection (LGPD art. 9º). Opens the policy in
 * a new tab: the same tab would throw away what the person typed.
 */
const SitePrivacyNotice = ({
  id,
  children,
  tone = "box",
  className,
}: SitePrivacyNoticeProps): JSX.Element => (
  <p
    id={id}
    className={cn(
      "m-0 flex gap-2.5 text-[13px] leading-[1.55] text-site-muted",
      tone === "box" && "rounded-[13px] bg-site-soft px-3.5 py-3",
      className,
    )}
  >
    <Lock aria-hidden className="mt-0.5 size-4 shrink-0" />
    <span>
      {children}{" "}
      <Link
        href={FORM_PRIVACY_HREF}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-sm text-site-ink underline underline-offset-2 outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-site-ink/40"
      >
        Política de Privacidade
        <span className="sr-only"> (abre em nova aba)</span>
      </Link>
      .
    </span>
  </p>
);

export {
  CharCounter,
  SiteField,
  SiteFieldError,
  SiteLabelText,
  SitePrivacyNotice,
  SITE_LABEL,
  siteInputClass,
};
