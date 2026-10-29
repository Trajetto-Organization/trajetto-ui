"use client";

import { useRef, useState, type DragEvent } from "react";

import { Loader, UploadCloud } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Where a file is dropped or chosen.
 *
 * The two import dialogs in Entregas had one each, and they were not the same
 * control. The XML one accepted a click anywhere inside it, answered the
 * keyboard, lit up while something was being dragged over it and said "Solte
 * os arquivos aqui"; the spreadsheet one was an inert box with an underlined
 * word inside that had to be hit exactly, no hover, no keyboard, and no sign
 * that a drag was even being noticed. Same module, same act, two behaviours —
 * and the drag-counter logic copied into both hooks, which is the part that
 * would have drifted next.
 *
 * The counter is not decoration: drag events fire on children too, so a naive
 * enter/leave pair flickers the whole time the cursor crosses anything inside
 * the zone.
 */
interface FileDropzoneProps {
  /** The `accept` attribute, e.g. `.xlsx,.csv`. */
  accept: string;
  multiple?: boolean;

  /** What to do, when nothing is happening. */
  label: string;

  /** What to do, while something is being dragged over it. */
  droppingLabel: string;

  /** The limits, in the user's words: formats, size, count. */
  hint: string;

  /** Shown inside the zone while the chosen file is being read. */
  isBusy?: boolean;
  busyLabel?: string;

  disabled?: boolean;

  /**
   * The zone's id: live validation focuses it on a refused submit, and the
   * error's id derives from it.
   */
  id?: string;

  /** What is wrong with the pick (missing, refused), said under the zone. */
  error?: string | null;

  onFiles: (files: FileList | null) => void;
}

const FileDropzone = ({
  accept,
  multiple = false,
  label,
  droppingLabel,
  hint,
  isBusy = false,
  busyLabel = "Lendo...",
  disabled = false,
  id,
  error = null,
  onFiles,
}: FileDropzoneProps): JSX.Element => {
  const errorId = id ? `${id}-error` : undefined;

  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef<number>(0);

  const [isDragging, setIsDragging] = useState<boolean>(false);

  const openPicker = () => {
    if (disabled) return;

    inputRef.current?.click();
  };

  const stopDragging = () => {
    dragDepth.current = 0;
    setIsDragging(false);
  };

  return (
    <div className="space-y-1.5">
      <div
        id={id}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        aria-label={label}
        aria-invalid={error ? true : undefined}
        aria-describedby={error && errorId ? errorId : undefined}
        onClick={openPicker}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;

          event.preventDefault();
          openPicker();
        }}
        onDragEnter={(event: DragEvent) => {
          event.preventDefault();

          if (disabled) return;

          dragDepth.current += 1;
          setIsDragging(true);
        }}
        onDragLeave={(event: DragEvent) => {
          event.preventDefault();

          dragDepth.current -= 1;

          if (dragDepth.current <= 0) stopDragging();
        }}
        onDragOver={(event: DragEvent) => event.preventDefault()}
        onDrop={(event: DragEvent) => {
          event.preventDefault();
          stopDragging();

          if (disabled) return;

          onFiles(event.dataTransfer.files);
        }}
        className={cn(
          `flex flex-col items-center justify-center gap-2 rounded-lg border-2
        border-dashed px-6 py-10 text-center transition-colors
        focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-ring focus-visible:ring-offset-2`,
          disabled
            ? "cursor-not-allowed opacity-60"
            : "cursor-pointer hover:border-primary/50 hover:bg-muted/40",
          isDragging && "border-primary bg-primary/5",
          // Red from the error only (decision 16.700): a required zone is
          // neutral until it is actually missing or refused.
          error && !isDragging && "border-red-600 dark:border-red-500",
        )}
      >
        <UploadCloud
          className={cn(
            "h-10 w-10",
            isDragging ? "text-primary" : "text-muted-foreground/50",
          )}
        />

        {isDragging ? (
          <p className="text-sm font-medium text-primary">{droppingLabel}</p>
        ) : (
          <>
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">{hint}</p>
          </>
        )}

        {isBusy && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader className="h-3 w-3 animate-spin" />
            {busyLabel}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          className="hidden"
          onChange={(event) => {
            onFiles(event.target.files);

            // Lets the same file be picked again after being removed.
            event.target.value = "";
          }}
        />
      </div>

      {error && (
        <p
          id={errorId}
          role="alert"
          className="break-words text-xs leading-4 text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
};

export { FileDropzone };
