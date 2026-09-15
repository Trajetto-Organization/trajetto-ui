import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StatCardProps } from "./stat-card.types";

const StatCard = ({
  title,
  value,
  change,
  icon,
  color,
}: StatCardProps): JSX.Element => (
  <div className="transition-transform duration-200 ease-out hover:-translate-y-1">
    <Card className="overflow-hidden shadow-md">
      <div className="flex">
        <div
          className="flex w-1/4 items-center 
          justify-center p-4"
          style={{ backgroundColor: color }}
        >
          {icon}
        </div>
        <div className="w-3/4">
          <CardHeader className="pb-2 pt-4">
            <CardTitle
              className="text-sm 
              font-medium truncate"
            >
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 pt-0">
            <div className="text-2xl font-bold">{value}</div>
            <p
              // The 600 shades read at 3.29:1 on a white card at 12px, under
              // the 4.5:1 that small text needs. The 700 shades carry the same
              // meaning and clear it.
              className={`mt-1 text-xs ${
                change > 0
                  ? "text-green-700 dark:text-green-400"
                  : change < 0
                    ? "text-red-700 dark:text-red-400"
                    : "text-gray-600 dark:text-gray-400"
              }`}
            >
              {change > 0 ? "+" : ""}
              {change}% em relação ao mês passado
            </p>
          </CardContent>
        </div>
      </div>
    </Card>
  </div>
);

export { StatCard };
