import { AlertCircle } from "lucide-react";

interface UploadProgressProps {
  progress: { uploaded: number; total: number } | null;
  error: string | null;
}

/**
 * Shows what the upload is actually doing.
 *
 * Photos now go straight from the browser to storage, which takes real time on
 * a phone connection — long enough that a bare spinner reads as a hang. This
 * is what the old flow was missing: it had no way to know how far along it was,
 * because the bytes were buried inside one opaque Server Action request.
 */
const UploadProgress = ({
  progress,
  error,
}: UploadProgressProps): JSX.Element | null => {
  if (error) {
    return (
      <div
        role="alert"
        className="flex items-start gap-2 rounded-md border border-destructive/40 
        bg-destructive/10 px-3 py-2 text-sm text-destructive"
      >
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (!progress || progress.total === 0) return null;

  const percentage = Math.round((progress.uploaded / progress.total) * 100);

  return (
    <div className="space-y-1.5" aria-live="polite">
      <p className="text-sm text-muted-foreground">
        Enviando fotos… {progress.uploaded} de {progress.total}
      </p>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={progress.total}
        aria-valuenow={progress.uploaded}
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary 
          transition-[width] duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export { UploadProgress };
export type { UploadProgressProps };
