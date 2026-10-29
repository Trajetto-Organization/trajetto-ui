import type {
  MessageChannel,
  MessageTopic,
} from "@/actions/delivery/message-templates";

/**
 * The eight messages a company can write, and what each one is for.
 *
 * Fixed rather than free-form: these are the four moments the customer can
 * act on — it left, the driver is heading to you now (decision 6.4), it
 * arrived, it did not arrive — and a company that could invent a fifth would
 * be inventing a message its customers did not agree to receive.
 */
interface MessageSlot {
  topic: MessageTopic;
  channel: MessageChannel;

  title: string;
  when: string;

  /** Shown as the starting point in an empty editor. */
  suggestion: string;
}

const OPT_OUT_LINE = "Para não receber mais: {{link_descadastro}}";

const MESSAGE_SLOTS: MessageSlot[] = [
  {
    topic: "DISPATCHED",
    channel: "WHATSAPP",
    title: "Saiu para entrega",
    when: "Quando a rota com esta entrega parte.",
    suggestion:
      "Olá {{destinatario}}! Sua entrega saiu com a {{transportadora}} e chega hoje. " +
      "Acompanhe: {{link}}\n\n" +
      OPT_OUT_LINE,
  },
  {
    topic: "DISPATCHED",
    channel: "EMAIL",
    title: "Saiu para entrega (e-mail)",
    when: "Quando a rota com esta entrega parte.",
    suggestion:
      "Olá {{destinatario}}, sua entrega saiu com a {{transportadora}} e chega hoje.\n" +
      "Nota fiscal: {{nota}} · Destino: {{cidade}}/{{uf}}\n\n" +
      "Acompanhe em {{link}}",
  },
  {
    topic: "ON_THE_WAY",
    channel: "WHATSAPP",
    title: "A caminho",
    when: "Quando o motorista avisa no aplicativo que está indo para este endereço (uma vez por entrega).",
    suggestion:
      "Olá {{destinatario}}! O motorista da {{transportadora}} está a caminho do seu endereço. " +
      "Acompanhe: {{link}}\n\n" +
      OPT_OUT_LINE,
  },
  {
    topic: "ON_THE_WAY",
    channel: "EMAIL",
    title: "A caminho (e-mail)",
    when: "Quando o motorista avisa no aplicativo que está indo para este endereço (uma vez por entrega).",
    suggestion:
      "Olá {{destinatario}}, o motorista da {{transportadora}} está a caminho do seu endereço.\n" +
      "Nota fiscal: {{nota}} · Destino: {{cidade}}/{{uf}}\n\n" +
      "Acompanhe em {{link}}",
  },
  {
    topic: "DELIVERED",
    channel: "WHATSAPP",
    title: "Entregue",
    when: "Assim que a entrega é comprovada.",
    // No {{recebido_por}} in the suggestions (DLV-MSG-4): the app's proof may
    // carry a photo and a signature without a name, and the sentence then
    // read "recebida por ." — the variable stays available to who wants it.
    suggestion:
      "{{destinatario}}, sua entrega foi concluída em {{data_entrega}}." +
      " Comprovante: {{link}}\n\n" +
      OPT_OUT_LINE,
  },
  {
    topic: "DELIVERED",
    channel: "EMAIL",
    title: "Entregue (e-mail)",
    when: "Assim que a entrega é comprovada.",
    suggestion:
      "Olá {{destinatario}}, sua entrega foi concluída em {{data_entrega}}.\n\n" +
      "O comprovante está disponível em {{link}}",
  },
  {
    topic: "FAILED",
    channel: "WHATSAPP",
    title: "Não foi possível entregar",
    when: "Quando a entrega termina sem sucesso.",
    suggestion:
      "{{destinatario}}, não conseguimos concluir sua entrega hoje. " +
      "Veja o que aconteceu e o que fazer: {{link}}\n\n" +
      OPT_OUT_LINE,
  },
  {
    topic: "FAILED",
    channel: "EMAIL",
    title: "Não foi possível entregar (e-mail)",
    when: "Quando a entrega termina sem sucesso.",
    suggestion:
      "Olá {{destinatario}}, não conseguimos concluir sua entrega hoje.\n" +
      "Nota fiscal: {{nota}}\n\n" +
      "Os detalhes estão em {{link}}",
  },
];

/** Every name a template may use, mirroring the API's closed set. */
const TEMPLATE_VARIABLES = [
  "destinatario",
  "transportadora",
  "nota",
  "pedido",
  "cidade",
  "uf",
  "previsao",
  "data_entrega",
  "recebido_por",
  "link",
  "link_descadastro",
] as const;

const slotKey = (topic: MessageTopic, channel: MessageChannel): string =>
  `${topic}:${channel}`;

export { MESSAGE_SLOTS, OPT_OUT_LINE, TEMPLATE_VARIABLES, slotKey };
export type { MessageSlot };
