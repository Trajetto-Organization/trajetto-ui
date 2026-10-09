import type { RouteStatus } from "./status";

/**
 * What the Cancelar Rota dialog says, by the route's status — the words the
 * API's cancel-route actually lives up to (trajetto-api
 * src/modules/route/usecases/cancel-route).
 *
 * The dialog used to promise "O motorista será avisado no aplicativo" for
 * every route. A PLANNED route was never handed over: the API notifies nobody
 * about it (push and socket only once released), and the driver never knew it
 * existed. Kept pure so that promise is tested, not eyeballed.
 */
interface CancelRouteCopyInput {
  status: RouteStatus;

  /** Stops still PENDING or ARRIVED: the ones the cancellation releases. */
  openStops: number;
}

interface CancelRouteCopy {
  /** Under the title: what cancelling THIS route means. */
  description: string;

  /** "Validações e consequências", in the order they happen. */
  consequences: string[];
}

function cancelRouteCopy({
  status,
  openStops,
}: CancelRouteCopyInput): CancelRouteCopy {
  const description =
    status === "IN_PROGRESS"
      ? "Esta rota já saiu. O motorista é avisado no aplicativo e as entregas que ainda estão com ele voltam para a lista de disponíveis."
      : status === "RELEASED"
        ? "A rota já foi liberada: o motorista é avisado no aplicativo de que ela foi cancelada."
        : "A rota ainda está em planejamento: o motorista não a vê no aplicativo e não é avisado.";

  const consequences: string[] = [
    "O motivo é obrigatório e fica registrado na rota e no histórico da operação.",
  ];

  if (openStops > 0) {
    consequences.push(
      openStops === 1
        ? "A parada ainda não resolvida é cancelada e a entrega volta para a lista de entregas disponíveis, sem motorista."
        : `As ${openStops} paradas ainda não resolvidas são canceladas e as entregas voltam para a lista de entregas disponíveis, sem motorista.`,
    );
  }

  consequences.push(
    "O que já foi entregue ou registrado como insucesso continua valendo.",
  );

  consequences.push(
    status === "PLANNED"
      ? "O motorista não é avisado: a rota ainda não tinha sido liberada para ele."
      : "O motorista é avisado no aplicativo (notificação e tela da rota).",
  );

  if (status === "IN_PROGRESS") {
    consequences.push("O veículo volta a ficar disponível para outra rota.");
  }

  consequences.push(
    "Os sistemas integrados recebem o aviso de cancelamento (webhook route.cancelled).",
    "Esta ação será registrada nos logs de atividade do sistema.",
    "Esta ação não pode ser desfeita: a rota fica como Cancelada no quadro.",
  );

  return { description, consequences };
}

export { cancelRouteCopy };
export type { CancelRouteCopy, CancelRouteCopyInput };
