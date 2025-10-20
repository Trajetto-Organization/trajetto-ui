"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

import { motion } from "framer-motion";

export interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label?: string;
  };
  variant?: "default" | "primary" | "success" | "warning" | "danger";
  isLoading?: boolean;
  onClick?: () => void;
}

const variantStyles = {
  default: {
    card: "hover:border-primary/50",
    icon: "bg-muted text-muted-foreground",
    value: "text-foreground",
  },
  primary: {
    card: "border-blue-500/20 hover:border-blue-500/40",
    icon: "bg-blue-500/10 text-blue-600",
    value: "text-blue-500",
  },
  success: {
    card: "border-green-500/20 hover:border-green-500/40",
    icon: "bg-green-500/10 text-green-600",
    value: "text-green-600",
  },
  warning: {
    card: "border-yellow-500/20 hover:border-yellow-500/40",
    icon: "bg-yellow-500/10 text-yellow-600",
    value: "text-yellow-600",
  },
  danger: {
    card: "border-red-500/20 hover:border-red-500/40",
    icon: "bg-red-500/10 text-red-600",
    value: "text-red-600",
  },
};

function StatCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="flex flex-row items-center 
        justify-between space-y-0 pb-2"
      >
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20 mb-2" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

function TrendIndicator({ value, label }: { value: number; label?: string }) {
  const isPositive = value > 0;
  const isNeutral = value === 0;

  const TrendIcon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;

  return (
    <div
      className={cn(
        "flex items-center gap-1 text-xs font-medium",
        isPositive && "text-green-600",
        !isPositive && !isNeutral && "text-red-600",
        isNeutral && "text-muted-foreground",
      )}
    >
      <TrendIcon className="h-3 w-3" />
      <span>
        {isPositive && "+"}
        {value}%
      </span>
      {label && <span className="text-muted-foreground ml-1">{label}</span>}
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  variant = "default",
  isLoading = false,
  onClick,
}: StatCardProps) {
  if (isLoading) {
    return <StatCardSkeleton />;
  }

  const styles = variantStyles[variant];

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ type: "spring", stiffness: 300 }}
      className="h-full"
    >
      <Card
        className={cn(
          "overflow-hidden shadow-md h-full flex flex-col",
          styles.card,
          onClick && "cursor-pointer",
        )}
        onClick={onClick}
      >
        <CardHeader
          className="flex flex-row items-start 
          justify-between space-y-0 pb-1 gap-2 min-h-[60px]"
        >
          <h3
            className="text-sm font-medium truncate
            text-muted-foreground line-clamp-2 flex-1"
          >
            {title}
          </h3>
          {Icon && (
            <div className={cn("p-2 rounded-md flex-shrink-0", styles.icon)}>
              <Icon className="h-4 w-4" />
            </div>
          )}
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-between">
          <div className={cn("text-2xl font-bold mb-2 truncate", styles.value)}>
            {value}
          </div>
          {(description || trend) && (
            <div
              className="flex items-center 
              justify-between gap-2"
            >
              {description && (
                <p
                  className="text-xs text-muted-foreground 
                  line-clamp-2 flex-1 truncate"
                >
                  {description}
                </p>
              )}
              {trend && (
                <TrendIndicator value={trend.value} label={trend.label} />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export { StatCard };
