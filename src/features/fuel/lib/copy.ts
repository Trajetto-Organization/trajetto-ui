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
 * Copies an id from a row menu, saying which one (`what`: "ID", "ID da
 * filial"...).
 *
 * The menus showed `"Erro ao copiar o ID: " + error`: the browser's raw
 * English DOMException ("NotAllowedError: Write permission denied.") inside
 * a Portuguese toast, and "o ID" whatever was being copied. The failure now
 * reads as a fixed sentence and the error goes to the console.
 */
async function copyWithFeedback(
  value: string,
  what: string,
  deps: CopyDeps = browserDeps(),
): Promise<boolean> {
  try {
    await deps.writeText(value);
    deps.success(`${what} copiado para a área de transferência!`);

    return true;
  } catch (error) {
    deps.log(`Copy of ${what} failed`, error);
    deps.error(COPY_FAILED);

    return false;
  }
}

export { COPY_FAILED, copyWithFeedback, type CopyDeps };
