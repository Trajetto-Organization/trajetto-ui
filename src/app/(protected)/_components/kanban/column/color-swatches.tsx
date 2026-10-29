"use client";

import { cn } from "@/lib/utils";

// The name is what a screen reader announces; a hex code means nothing.
const KANBAN_COLUMN_COLORS = [
  { value: "#64748b", name: "Ardósia" },
  { value: "#3b82f6", name: "Azul" },
  { value: "#f59e0b", name: "Âmbar" },
  { value: "#8b5cf6", name: "Violeta" },
  { value: "#22c55e", name: "Verde" },
  { value: "#ef4444", name: "Vermelho" },
  { value: "#ec4899", name: "Rosa" },
  { value: "#06b6d4", name: "Ciano" },
] as const;

interface ColorSwatchesProps {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

/**
 * The preset colours of a Kanban column, shared by Nova Coluna and Editar.
 *
 * `flex-wrap`: eight 32px swatches need 312px and a 320px phone gives the
 * field 272px — the row ran past the modal's edge and dragged the colour
 * input with it. The chosen one is marked with a ring in the text colour
 * (it was a black border, invisible on the dark theme).
 */
const ColorSwatches = ({
  value,
  onChange,
  disabled,
}: ColorSwatchesProps): JSX.Element => (
  <div className="flex flex-wrap gap-2" data-color-swatches>
    {KANBAN_COLUMN_COLORS.map(({ value: presetColor, name }) => (
      <button
        key={presetColor}
        type="button"
        // The name says which colour it is; `aria-pressed` says which one is
        // chosen, which the ring otherwise carries only visually.
        aria-label={`Cor ${name}`}
        aria-pressed={value === presetColor}
        className={cn(
          "h-8 w-8 rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          value === presetColor &&
            "ring-2 ring-foreground ring-offset-2 ring-offset-background",
        )}
        style={{ backgroundColor: presetColor }}
        onClick={() => onChange(presetColor)}
        disabled={disabled}
      />
    ))}
  </div>
);

export { ColorSwatches, KANBAN_COLUMN_COLORS };
