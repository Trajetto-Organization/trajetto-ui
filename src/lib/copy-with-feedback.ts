import { toast } from "sonner";

/** Where the copy writes and what it says; the defaults are the browser's. */
interface CopyDeps {
  writeText: (value: string) => Promise<void>;
  success: (message: string) => void;
  error: (message: string) => void;
  log: (message: string, error: unknown) => void;
}

const COPY_FAILED = "Não foi possível copiar. Copie manualmente.";

const browserDeps = (): CopyDeps => ({
  writeText: (value) => navigator.clipboard.writeText(value),
  success: (message) => toast.success(message),
  error: (message) => toast.error(message),
  log: (message, error) => console.warn(message, error),
});

/**
 * Copies a value from a row menu, saying which one (`what`: "ID", "ID da
 * filial", "Placa"...). The one copy of every "Copiar ID" in the tables:
 * it always writes the FULL value it is given — the tables show a compact
 * id (IdCell), the clipboard gets the real one.
 *
 * The menus each had their own copy, most showing
 * `"Erro ao copiar o ID: " + error`: the browser's raw English DOMException
 * ("NotAllowedError: Write permission denied.") inside a Portuguese toast,
 * and "o ID" whatever was being copied. The failure now reads as a fixed
 * sentence and the error goes to the console.
 *
 * A missing value (an optional relation) copies nothing and says nothing:
 * its menu item is not offered in the first place.
 *
 * `feminine` makes the toast agree with a feminine label ("Placa copiada"):
 * every other label is an "ID…" or "E-mail", masculine.
 */
async function copyWithFeedback(
  value: string | null | undefined,
  what: string,
  options: Partial<CopyDeps> & { feminine?: boolean } = {},
): Promise<boolean> {
  const { feminine = false, ...overrides } = options;
  const deps: CopyDeps = { ...browserDeps(), ...overrides };

  if (!value) return false;

  try {
    await deps.writeText(value);
    deps.success(
      `${what} ${feminine ? "copiada" : "copiado"} para a área de transferência!`,
    );

    return true;
  } catch (error) {
    deps.log(`Copy of ${what} failed`, error);
    deps.error(COPY_FAILED);

    return false;
  }
}

export { COPY_FAILED, copyWithFeedback, type CopyDeps };
