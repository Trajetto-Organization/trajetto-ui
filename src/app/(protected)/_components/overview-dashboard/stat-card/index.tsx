import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { StatCardProps } from "./stat-card.types";

const StatCard = ({
  title,
  value,
  change,
  icon,
  color,
}: StatCardProps): JSX.Element => (
  <motion.div
    whileHover={{ y: -5 }}
    transition={{ type: "spring", stiffness: 300 }}
  >
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
              className={`mt-1 text-xs ${
                change > 0
                  ? "text-green-600"
                  : change < 0
                    ? "text-red-600"
                    : "text-gray-500"
              }`}
            >
              {change > 0 ? "+" : ""}
              {change}% em relação ao mês passado
            </p>
          </CardContent>
        </div>
      </div>
    </Card>
  </motion.div>
);

export { StatCard };
