import type { ReactNode } from "react";

import {
  BatteryMedium,
  Bell,
  Camera,
  Check,
  ChevronLeft,
  CloudOff,
  CloudUpload,
  House,
  MapPin,
  MessagesSquare,
  Package,
  SignalHigh,
  Wifi,
  WifiOff,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The driver app mockup (design: Trajetto Phone), with every screen and its
 * animations: deliveries, proof of delivery, offline queue, refuelling and
 * checklist. The app itself has a light UI, so the mockup stays light in the
 * dark theme too, as in the design.
 *
 * Responsive: like the design, the screen lays out 1:1 at the phone's real
 * inner size (same type size at any width; a short phone crops the bottom).
 * Only very narrow phones (< 228px inside, where rows would no longer fit) scale down in CSS
 * (`.site-phone-screen` in globals.css). Give it a width; its height
 * follows the 9:18.5 ratio.
 *
 * No hooks and no "use client": server pages can render it, and a client
 * carousel can too. Changing `screen` remounts the screen (key), which
 * replays its entrance animations. Reduced motion shortens them (globals).
 */

type PhoneScreen = "deliveries" | "proof" | "offline" | "fuel" | "checklist";

const SCREEN_LABEL: Record<PhoneScreen, string> = {
  deliveries:
    "Entregas do dia: rota em andamento com três paradas e o status de cada uma.",
  proof:
    "Comprovação de entrega: foto do canhoto, assinatura na tela, quem recebeu e localização registrada.",
  offline:
    "Fila sem sinal: os registros ficam no aparelho e são enviados quando a conexão volta.",
  fuel: "Abastecimento: foto do odômetro, quilometragem, litros, preço por litro e total.",
  checklist: "Checklist do veículo: itens conferidos com foto, um a um.",
};

interface PhoneMockupProps {
  screen?: PhoneScreen;
  className?: string;
  /** Overrides the accessible description of the screen. */
  label?: string;
}

const PhoneMockup = ({
  screen = "deliveries",
  className,
  label,
}: PhoneMockupProps): JSX.Element => (
  <div
    role="img"
    aria-label={`App do motorista Trajetto. ${label ?? SCREEN_LABEL[screen]}`}
    className={cn(
      "relative aspect-[9/18.5] w-full select-none rounded-[2.4rem] border-[7px] border-[#18181b] bg-[#18181b] font-site text-[#111827]",
      "shadow-[0_0_0_1px_rgba(63,63,70,.6),0_40px_80px_-24px_rgba(10,10,20,.45),0_18px_36px_-18px_rgba(10,10,20,.35)]",
      className,
    )}
  >
    <div className="site-phone-viewport absolute inset-0 overflow-hidden rounded-[1.9rem] bg-[#f9fafb]">
      <div key={screen} className="site-phone-screen">
        <div className="absolute inset-0 animate-[tpScreenIn_380ms_cubic-bezier(.22,1,.36,1)_both]">
          {screen === "deliveries" ? <DeliveriesScreen /> : null}
          {screen === "proof" ? <ProofScreen /> : null}
          {screen === "offline" ? <OfflineScreen /> : null}
          {screen === "fuel" ? <FuelScreen /> : null}
          {screen === "checklist" ? <ChecklistScreen /> : null}
        </div>
      </div>
    </div>
    {/* Front camera. */}
    <span className="absolute left-1/2 top-2 size-2.5 -translate-x-1/2 rounded-full bg-[#18181b]" />
  </div>
);

/* ------------------------------------------------------------------ */
/* Building blocks (sizes are the design's, in screen px)             */
/* ------------------------------------------------------------------ */

const RISE = "animate-[tpRise_520ms_cubic-bezier(.22,1,.36,1)_both]";
const POP = "animate-[tpPhonePop_420ms_cubic-bezier(.34,1.56,.64,1)_both]";

const StatusBar = ({ wifi }: { wifi?: ReactNode }) => (
  <div className="flex items-center justify-between px-5 pb-1 pt-2.5 text-[10px] font-semibold text-[#111827]">
    <span>09:41</span>
    <span className="flex items-center gap-1">
      <SignalHigh aria-hidden width={12} height={12} />
      {wifi ?? <Wifi aria-hidden width={12} height={12} />}
      <BatteryMedium aria-hidden width={14} height={14} />
    </span>
  </div>
);

const ScreenHeader = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) => (
  <div className="flex items-center gap-2 border-b border-[#e5e7eb] bg-white px-3 py-2.5">
    <ChevronLeft aria-hidden width={16} height={16} color="#374151" />
    <div className="min-w-0">
      <p className="m-0 text-xs font-bold">{title}</p>
      <p className="m-0 text-[9px] text-[#6b7280]">{subtitle}</p>
    </div>
  </div>
);

const FieldLabel = ({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: "required" | "optional";
}) => (
  <p className="mb-1 mt-0 text-[10px] font-medium">
    {children}
    {hint === "required" ? <span className="text-[#b91c1c]"> *</span> : null}
    {hint === "optional" ? (
      <span className="font-normal text-[#6b7280]"> (opcional)</span>
    ) : null}
  </p>
);

const Input = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "rounded-lg border border-[#d1d5db] bg-white px-2 py-1.5 text-[10px]",
      className,
    )}
  >
    {children}
  </div>
);

/** Android's gesture navigation handle, at the very bottom of the screen. */
const GestureHandle = () => (
  <span className="mx-auto mt-2 block h-[3px] w-16 rounded-full bg-[#111827]/75" />
);

/**
 * The screen's primary action, pinned to the bottom like a real Android
 * form's action bar: content scrolls under it (hence the translucent fill,
 * blur and hairline), and the gesture handle keeps it off the bottom edge.
 * Inline in the content it floated mid-screen with blank space below.
 */
const ActionBar = ({ children }: { children: ReactNode }) => (
  <div
    data-phone-action-bar
    className="absolute inset-x-0 bottom-0 z-10 border-t border-[#e5e7eb]/90 bg-white/85 px-3 pb-1.5 pt-2.5 shadow-[0_-8px_18px_-14px_rgba(15,23,42,.35)] backdrop-blur-md"
  >
    <div className="rounded-lg bg-[#2563eb] py-2 text-center text-[11px] font-semibold text-white shadow-[0_4px_10px_-4px_rgba(37,99,235,.55)]">
      {children}
    </div>
    <GestureHandle />
  </div>
);

const Pill = ({
  tone,
  children,
}: {
  tone: "slate" | "blue" | "violet";
  children: ReactNode;
}) => (
  <span
    className={cn(
      "shrink-0 rounded-full px-2 py-0.5 text-[8px] font-medium",
      tone === "slate" && "bg-[#f1f5f9] text-[#1e293b]",
      tone === "blue" && "bg-[#dbeafe] text-[#1e40af]",
      tone === "violet" && "bg-[#ede9fe] text-[#5b21b6]",
    )}
  >
    {children}
  </span>
);

const LocationBadge = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 self-start rounded-full bg-[#ecfdf5] px-2 py-0.5 text-[8px] font-medium text-[#047857]",
      className,
    )}
  >
    <MapPin aria-hidden width={10} height={10} />
    {children}
  </span>
);

interface StopProps {
  n: number;
  name: string;
  order: string;
  status: string;
  tone: "slate" | "blue" | "violet";
  address?: string;
  className?: string;
}

const Stop = ({
  n,
  name,
  order,
  status,
  tone,
  address,
  className,
}: StopProps) => (
  <div
    className={cn(
      "rounded-xl border border-[#e5e7eb] bg-white p-2.5",
      className,
    )}
  >
    <div className="flex items-start gap-2">
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#dbeafe] text-[9px] font-bold text-[#1e40af]">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="m-0 text-[11px] font-semibold text-[#111827]">{name}</p>
        <p className="m-0 text-[9px] text-[#6b7280]">Pedido: {order}</p>
      </div>
      <Pill tone={tone}>{status}</Pill>
    </div>
    {address ? (
      <p className="m-0 mt-1.5 flex items-center gap-1 text-[9px] text-[#4b5563]">
        <MapPin aria-hidden width={10} height={10} color="#6b7280" />
        {address}
      </p>
    ) : null}
  </div>
);

/* ------------------------------------------------------------------ */
/* Screens                                                             */
/* ------------------------------------------------------------------ */

const DeliveriesScreen = () => (
  <>
    <StatusBar />
    <div className="flex items-start justify-between px-4 pt-2">
      <div className="min-w-0">
        <p className="m-0 text-[9px] font-medium text-[#374151]">
          Bem-vindo de volta!
        </p>
        <p className="m-0 text-[15px] font-bold text-[#111827]">Carlos Souza</p>
        <div className="mt-1 flex gap-1">
          <Pill tone="blue">Entregas</Pill>
          <Pill tone="slate">Motorista</Pill>
        </div>
      </div>
      <span className="relative mt-1 flex rounded-full bg-white p-1.5 shadow-[0_1px_2px_rgba(0,0,0,.06)]">
        <Bell aria-hidden width={14} height={14} color="#374151" />
        <span className="absolute right-1 top-1 size-1.5 rounded-full bg-[#ef4444]" />
      </span>
    </div>
    <div
      className={cn("mx-3 mt-3 rounded-xl bg-[#2563eb] p-3 text-white", RISE)}
    >
      <div className="flex items-center justify-between">
        <p className="m-0 text-[11px] font-semibold">Rota de hoje</p>
        <span className="rounded-full bg-[#1e40af] px-2 py-0.5 text-[8px] font-medium">
          Em andamento
        </span>
      </div>
      <p className="m-0 mt-0.5 text-[9px] text-[#eff6ff]">
        3 paradas · 1 concluída
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/25">
        <div className="h-full w-[33.3%] origin-left animate-[tpFill_2200ms_ease-in-out_600ms_both] rounded-full bg-white" />
      </div>
    </div>
    <p className="m-0 px-4 pb-1.5 pt-3 text-[10px] font-semibold text-[#111827]">
      Paradas
    </p>
    <div className="flex flex-col gap-2 px-3">
      <Stop
        n={1}
        name="Mercado Bom Preço"
        order="48213"
        status="Entregue"
        tone="slate"
        address="Av. Brasil, 1200 · Centro"
        className={cn(RISE, "[animation-delay:150ms]")}
      />
      <Stop
        n={2}
        name="Farmácia Vida"
        order="48214"
        status="Em rota"
        tone="blue"
        address="R. das Flores, 87 · Jardim"
        className={cn(RISE, "[animation-delay:270ms]")}
      />
      <Stop
        n={3}
        name="Padaria Central"
        order="48215"
        status="Designada"
        tone="violet"
        address="R. XV de Novembro, 45"
        className={cn(RISE, "[animation-delay:390ms]")}
      />
    </div>
    <div className="absolute inset-x-0 bottom-0 bg-[#f9fafb] px-4 pb-1.5 pt-1.5">
      <div className="flex rounded-2xl border border-white/70 bg-white px-1.5 py-1 shadow-[0_6px_16px_rgba(15,23,42,.12)]">
        <TabItem
          icon={<House aria-hidden width={16} height={16} />}
          label="Início"
        />
        <TabItem
          icon={
            <Package aria-hidden width={16} height={16} strokeWidth={2.4} />
          }
          label="Entregas"
          active
        />
        <TabItem
          icon={<MessagesSquare aria-hidden width={16} height={16} />}
          label="Chat"
        />
      </div>
      <GestureHandle />
    </div>
  </>
);

const TabItem = ({
  icon,
  label,
  active,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
}) => (
  <div
    className={cn(
      "flex flex-1 flex-col items-center py-1",
      active ? "text-[#2563eb]" : "text-[#6b7280]",
    )}
  >
    {icon}
    <span
      className={cn(
        "mt-0.5 text-[9px]",
        active ? "font-semibold" : "font-medium",
      )}
    >
      {label}
    </span>
  </div>
);

const ProofScreen = () => (
  <>
    <StatusBar />
    <ScreenHeader
      title="Comprovação de entrega"
      subtitle="Parada 2 · Farmácia Vida"
    />
    <div className="flex flex-col gap-2.5 px-3 pt-2.5">
      <div>
        <FieldLabel hint="required">Foto do canhoto</FieldLabel>
        <div className="relative h-[68px] overflow-hidden rounded-lg border border-[#e5e7eb] bg-[#f3f4f6] p-1.5">
          <div className="h-full w-3/4 -rotate-2 rounded-sm bg-white p-1.5 shadow-[0_1px_2px_rgba(0,0,0,.08)]">
            <p className="m-0 text-[7px] font-bold text-[#1f2937]">
              NF-e 000.482.113
            </p>
            <div className="mt-1 flex flex-col gap-0.5">
              <div className="h-[3px] rounded-sm bg-[#e5e7eb]" />
              <div className="h-[3px] w-4/5 rounded-sm bg-[#e5e7eb]" />
              <div className="h-[3px] w-3/5 rounded-sm bg-[#e5e7eb]" />
            </div>
            <p className="m-0 mt-1 text-[6px] text-[#6b7280]">
              Recebi as mercadorias constantes
            </p>
          </div>
          {/* Camera flash, then the check. */}
          <span className="absolute inset-0 animate-[tpFlash_700ms_ease-out_350ms_both] bg-white opacity-0" />
          <span
            className={cn(
              "absolute bottom-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-[#10b981] [animation-delay:900ms]",
              POP,
            )}
          >
            <Check
              aria-hidden
              width={12}
              height={12}
              color="#fff"
              strokeWidth={3}
            />
          </span>
        </div>
      </div>
      <div>
        <FieldLabel hint="optional">Assinatura na tela</FieldLabel>
        <div className="rounded-lg border border-[#e5e7eb] bg-white px-2 py-1">
          <svg aria-hidden viewBox="0 0 130 44" className="block h-9 w-full">
            <path
              d="M6 30 C 14 8, 22 8, 22 26 S 30 40, 38 22 S 48 6, 54 24 S 62 36, 70 20 C 76 10, 84 12, 86 24 S 96 34, 108 18 L 124 16"
              pathLength={1}
              fill="none"
              stroke="#111827"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-[tpDraw_1500ms_ease-in-out_900ms_both]"
            />
          </svg>
          <div className="border-t border-dashed border-[#d1d5db] pt-0.5 text-[7px] text-[#6b7280]">
            Assine dentro do quadro
          </div>
        </div>
      </div>
      <div>
        <FieldLabel hint="optional">Quem recebeu</FieldLabel>
        <Input>
          <span className="inline-block animate-[tpType_1100ms_steps(14,end)_2300ms_both] whitespace-nowrap">
            Mariana Alves
          </span>
        </Input>
      </div>
      <LocationBadge className={cn(POP, "[animation-delay:3400ms]")}>
        Localização registrada
      </LocationBadge>
    </div>
    <ActionBar>Confirmar entrega</ActionBar>
  </>
);

const Banner = ({
  icon,
  title,
  text,
  className,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  className?: string;
}) => (
  <div
    className={cn("flex items-center gap-2 px-3 py-2 text-white", className)}
  >
    {icon}
    <div className="min-w-0">
      <p className="m-0 text-[10px] font-semibold">{title}</p>
      <p className="m-0 text-[8px]">{text}</p>
    </div>
  </div>
);

// One 4.6s cycle: offline (0–46%), sending (50–78%), sent (82–100%).

const OfflineScreen = () => (
  <>
    <StatusBar
      wifi={
        <span className="relative size-3">
          <WifiOff
            aria-hidden
            width={12}
            height={12}
            className="absolute inset-0 animate-[tpBeat1_4600ms_linear_both]"
          />
          <Wifi
            aria-hidden
            width={12}
            height={12}
            className="absolute inset-0 animate-[tpOnline_4600ms_linear_both]"
          />
        </span>
      }
    />
    <div className="relative h-[70px]">
      <div className="absolute inset-0 animate-[tpBeat1_4600ms_linear_both]">
        <Banner
          className="bg-[#b45309]"
          icon={<CloudOff aria-hidden width={14} height={14} />}
          title="Sem conexão"
          text="Seus dados serão enviados quando a conexão voltar."
        />
        <Banner
          className="bg-[#2563eb]"
          icon={<CloudUpload aria-hidden width={14} height={14} />}
          title="2 envios pendentes"
          text="Serão enviados assim que houver conexão."
        />
      </div>
      <div className="absolute inset-0 animate-[tpBeat2_4600ms_linear_both] opacity-0">
        <Banner
          className="bg-[#2563eb]"
          icon={<CloudUpload aria-hidden width={14} height={14} />}
          title="Enviando registros pendentes…"
          text="O envio continua de onde parou."
        />
        <div className="box-border h-[35px] bg-[#eff6ff] px-3 py-2">
          <div className="h-1.5 overflow-hidden rounded-full bg-[#dbeafe]">
            <div className="h-full origin-left animate-[tpFill_2200ms_ease-in-out_600ms_both] rounded-full bg-[#2563eb]" />
          </div>
          <p className="m-0 mt-1 text-[8px] text-[#1e40af]">
            Comprovante · 2 fotos e assinatura
          </p>
        </div>
      </div>
      <div className="absolute inset-0 animate-[tpBeat3_4600ms_linear_both] opacity-0">
        <Banner
          className="box-border h-[70px] bg-[#047857]"
          icon={<Check aria-hidden width={14} height={14} />}
          title="Envios concluídos"
          text="O que aguardava conexão chegou à empresa."
        />
      </div>
    </div>
    <p className="m-0 px-4 pb-1.5 pt-3 text-[10px] font-semibold">Paradas</p>
    <div className="flex flex-col gap-2 px-3">
      <Stop
        n={1}
        name="Mercado Bom Preço"
        order="48213"
        status="Entregue"
        tone="slate"
      />
      <Stop
        n={2}
        name="Farmácia Vida"
        order="48214"
        status="Em rota"
        tone="blue"
      />
    </div>
  </>
);

const FuelScreen = () => (
  <>
    <StatusBar />
    <ScreenHeader title="Abastecimento" subtitle="RTA1B23 · Volvo FH 540" />
    <div className="flex flex-col gap-2.5 px-3 pt-2.5">
      <div>
        <FieldLabel hint="required">Foto do Odômetro</FieldLabel>
        <div className="relative flex h-[62px] items-center justify-center overflow-hidden rounded-lg bg-[#0f172a] bg-[linear-gradient(#1e293b,#0f172a)]">
          <span className="font-site-mono text-lg font-bold tracking-[.1em] text-white">
            187.450
          </span>
          <span className="absolute inset-x-0 top-3 h-0.5 animate-[tpScan_1800ms_ease-in-out_infinite] bg-[linear-gradient(90deg,transparent,#f06292,transparent)]" />
        </div>
      </div>
      <div>
        <FieldLabel hint="required">Quilometragem Atual (km)</FieldLabel>
        <Input>187.450</Input>
      </div>
      <div className="grid grid-cols-2 items-end gap-2">
        <div>
          <FieldLabel hint="required">Quantidade de Litros</FieldLabel>
          <Input>180,5</Input>
        </div>
        <div>
          <FieldLabel hint="required">Preço por Litro</FieldLabel>
          <Input>R$ 6,19</Input>
        </div>
      </div>
      <div
        className={cn(
          "flex items-center justify-between rounded-lg bg-[#eff6ff] px-2.5 py-2 [animation-delay:700ms]",
          RISE,
        )}
      >
        <span className="text-[9px] font-medium text-[#1e40af]">Total</span>
        <span className="text-xs font-bold text-[#1e3a8a]">R$ 1.117,30</span>
      </div>
      <LocationBadge>Posição capturada no envio</LocationBadge>
    </div>
    <ActionBar>Abastecer</ActionBar>
  </>
);

const CHECKLIST = [
  "Condição dos Pneus",
  "Faróis Funcionando",
  "Freios Funcionando",
  "Extintor Válido",
  "Triângulo Presente",
];

const ChecklistScreen = () => (
  <>
    <StatusBar />
    <ScreenHeader title="Checklist" subtitle="RTA1B23 · Volvo FH 540" />
    <div className="px-3 pt-2.5">
      <div className="rounded-xl border border-[#e5e7eb] bg-white">
        {CHECKLIST.map((item, index) => (
          <div
            key={item}
            className="flex items-center justify-between gap-2 border-t border-[#f3f4f6] px-2.5 py-2"
          >
            <div className="flex min-w-0 items-center gap-1.5">
              <Camera aria-hidden width={12} height={12} color="#9ca3af" />
              <span className="text-[10px]">{item}</span>
            </div>
            <span
              className={cn(
                "flex size-4 shrink-0 items-center justify-center rounded-full bg-[#10b981]",
                POP,
              )}
              style={{ animationDelay: `${300 + index * 380}ms` }}
            >
              <Check
                aria-hidden
                width={10}
                height={10}
                color="#fff"
                strokeWidth={3}
              />
            </span>
          </div>
        ))}
      </div>
      <p className="m-0 mt-2 text-[9px] text-[#6b7280]">
        Observações (Opcional)
      </p>
      <Input className="mt-1 text-[#6b7280]">
        Digite observações sobre o checklist...
      </Input>
    </div>
    <ActionBar>Criar Checklist</ActionBar>
  </>
);

const PHONE_SCREENS: readonly PhoneScreen[] = [
  "deliveries",
  "proof",
  "offline",
  "fuel",
  "checklist",
];

export { PHONE_SCREENS, PhoneMockup };
export type { PhoneMockupProps, PhoneScreen };
