import { cn } from "@/lib/utils";

interface InfoBoxItem {
  icon: string;
  label: string;
  description: string;
}

interface InfoBoxProps {
  title: string;
  items: InfoBoxItem[];
  variant?: "blue" | "green";
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
  };

  const styles = variantStyles[variant];

  return (
    <div className={cn("p-4 rounded-lg border", styles.container, className)}>
      <h4 className={cn("font-semibold mb-2", styles.title)}>{title}</h4>
      <ul className={cn("text-sm space-y-1", styles.text)}>
        {items.map((item, index) => (
          <li key={index}>
            •{" "}
            <strong>
              {item.icon} {item.label}:
            </strong>{" "}
            {item.description}
          </li>
        ))}
      </ul>
    </div>
  );
};

export { InfoBox };
