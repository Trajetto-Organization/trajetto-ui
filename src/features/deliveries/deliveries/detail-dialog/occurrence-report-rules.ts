import type {
  OccurrenceFormAnswers,
  OccurrenceFormField,
} from "../../occurrence-types/form-builder/rules";

/**
 * The panel's own report of an occurrence (decision 6.3), apart from the
 * dialog so what it tells the operator is tested without a browser.
 */

interface PanelReportFormInput {
  /** The type's form_version as the selector loaded it. */
  formVersion: number | undefined;
  /** Its questions (readFormFields); null when it has none. */
  fields: OccurrenceFormField[] | null;
  /** The answers validateOccurrenceAnswers kept. */
  answers: OccurrenceFormAnswers | null;
}

/**
 * The form part of the panel's report. `form_version` goes on EVERY report,
 * with or without questions (contract §7): it is how the API tells a form
 * edited since the selector loaded (409 with the new form, which reloads the
 * types) from wrong answers. Sent only with questions, a type that gained
 * required ones meanwhile came back 400 naming fields the dialog never showed.
 */
function panelReportForm({
  formVersion,
  fields,
  answers,
}: PanelReportFormInput): {
  form_answers?: OccurrenceFormAnswers;
  form_version?: number;
} {
  return {
    ...(fields && { form_answers: answers ?? {} }),
    ...(formVersion !== undefined && { form_version: formVersion }),
  };
}

/**
 * What a type that asks the tower means when the report comes from the
 * panel. The API grants it as authorized only to someone who could approve
 * it in the queue (MASTER, admin, or a profile that writes deliveries);
 * anyone else files a request like the driver does.
 */
function panelReportAuthorizationNotice(canDecide: boolean): string {
  return canDecide
    ? "Este tipo exige autorização da torre. Registrado por você, vale como autorizado por você e aplica o efeito na hora."
    : "Este tipo exige autorização da torre. Seu perfil não decide pela torre: o registro vai para a fila de autorização e só tem efeito depois de autorizado.";
}

/**
 * The cached lists a refused report proves stale. A 409 OCCURRENCE_FORM_OUTDATED
 * means the type's form changed since the selector loaded it: without a new
 * read the operator keeps answering the old form.
 */
function queriesStaleAfterReport(
  code: string | undefined,
  businessId: string,
): Array<readonly unknown[]> {
  return code === "OCCURRENCE_FORM_OUTDATED"
    ? [["occurrence-types-select", businessId]]
    : [];
}

export {
  panelReportAuthorizationNotice,
  panelReportForm,
  queriesStaleAfterReport,
};
