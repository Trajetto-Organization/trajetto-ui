import { hasConsecutiveSpaces, hasSpaceAtEdges } from "@/lib/format-values";

/**
 * "Quem recebeu" on a panel write-off (decision 5.3), with the API's rules and
 * sentences (trajetto-api update-delivery-status-schema): required, 2 to 150
 * characters, no space at either end and no doubled spaces. Null when valid.
 */
function receivedByError(value: string): string | null {
  if (value.trim().length === 0) return "Informe quem recebeu a entrega.";

  if (value.trim().length < 2) {
    return "O nome de quem recebeu deve ter no mínimo 2 caracteres.";
  }

  if (value.length > 150) {
    return "O nome de quem recebeu deve ter no máximo 150 caracteres.";
  }

  if (hasConsecutiveSpaces(value)) {
    return "O nome de quem recebeu não deve conter espaços consecutivos.";
  }

  if (hasSpaceAtEdges(value)) {
    return "O nome de quem recebeu não pode começar ou terminar com espaço em branco.";
  }

  return null;
}

export { receivedByError };
