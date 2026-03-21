import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface InfoBoxItem {
  label: string;
  value: string | ReactNode;
  condition?: boolean; // Optional: only show if condition is true
}

interface InfoBoxProps {
  title: string;
  items: InfoBoxItem[];
  variant?: "blue" | "green" | "purple";
  className?: string;
}

const InfoBox = ({
  title,
  items,
  variant = "blue",
  className,
}: InfoBoxProps) => {
  const variantStyles = {
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
  };

  const styles = variantStyles[variant];

  // Filter items based on condition (if provided)
  const visibleItems = items.filter((item) =>
    item.condition !== undefined ? item.condition : true,
  );

  return (
    <div className={cn("p-4 rounded-lg border", styles.container, className)}>
      <h4 className={cn("font-semibold mb-2", styles.title)}>{title}</h4>
      <div className={cn("text-sm space-y-1", styles.text)}>
        {visibleItems.map((item, index) => (
          <div key={index}>
            • <strong>{item.label}:</strong> {item.value}
          </div>
        ))}
      </div>
    </div>
  );
};

export { InfoBox };
