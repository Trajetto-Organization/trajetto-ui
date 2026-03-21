import Link from "next/link";
import { motion } from "framer-motion";

import { Card, CardTitle } from "@/components/ui/card";
import type { QuickLinkCardProps } from "./quick-link-card.types";

const QuickLinkCard = ({
  title,
  icon,
  href,
  color,
}: QuickLinkCardProps): JSX.Element => (
  <motion.div
    whileHover={{ scale: 1.05 }}
    transition={{ type: "spring", stiffness: 300 }}
    className="h-full"
  >
    <Card
      className="shadow-md transition-all 
      hover:bg-muted/50 h-full min-h-[120px] 
      sm:min-h-[140px]"
    >
      <Link
        href={href}
        className="flex h-full flex-col items-center 
        justify-center p-4 sm:p-6 text-center"
      >
        <div
          className="mb-2 sm:mb-3 rounded-full 
          p-2 sm:p-3 flex-shrink-0"
          style={{ backgroundColor: `${color}20`, color: color }}
        >
          {icon}
        </div>
        <CardTitle
          className="text-xs sm:text-sm 
          font-medium leading-tight"
        >
          {title}
        </CardTitle>
      </Link>
    </Card>
  </motion.div>
);

export { QuickLinkCard };
