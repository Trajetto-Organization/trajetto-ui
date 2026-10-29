import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A titled box of "• label: value" lines for the service order forms. The
 * create and edit forms each carried their own copy with a different shape
 * (one with icons, one with conditional lines); this one takes both.
 */
interface InfoBoxItem {
  label: string;
  value: ReactNode;
  icon?: string;
  /** When given, the line shows only if true. */
  condition?: boolean;
}

interface InfoBoxProps {
  title: string;
  items: InfoBoxItem[];
  variant?: "blue" | "green" | "purple";
  className?: string;
}

const VARIANTS = {
  blue: {
    container: "bg-blue-50 dark:bg-blue-900/20 border-blue-200",
    title: "text-blue-700 dark:text-blue-300",
    text: "text-blue-600 dark:text-blue-400",
  },
  green: {
    container: "bg-green-50 dark:bg-green-900/20 border-green-200",
    title: "text-green-700 dark:text-green-300",
    text: "text-green-600 dark:text-green-400",
  },
  purple: {
    container: "bg-purple-50 dark:bg-purple-900/20 border-purple-200",
    title: "text-purple-700 dark:text-purple-300",
    text: "text-purple-600 dark:text-purple-400",
  },
} as const;

const InfoBox = ({
  title,
  items,
  variant = "blue",
  className,
}: InfoBoxProps): JSX.Element => {
  const styles = VARIANTS[variant];

  return (
    <div className={cn("rounded-lg border p-4", styles.container, className)}>
      <h4 className={cn("mb-2 font-semibold", styles.title)}>{title}</h4>
      <ul className={cn("space-y-1 text-sm break-words", styles.text)}>
        {items
          .filter((item) => item.condition ?? true)
          .map((item) => (
            <li key={item.label}>
              •{" "}
              <strong>
                {item.icon ? `${item.icon} ` : ""}
                {item.label}:
              </strong>{" "}
              {item.value}
            </li>
          ))}
      </ul>
    </div>
  );
};

export { InfoBox };
