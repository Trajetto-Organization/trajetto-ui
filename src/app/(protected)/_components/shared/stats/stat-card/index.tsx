"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

import { StatCardProps } from "../shared/common.types";

const variantStyles = {
  default: {
    card: "hover:border-primary/50",
    icon: "bg-muted text-muted-foreground",
    value: "text-foreground",
  },
  primary: {
    card: "border-blue-500/20 hover:border-blue-500/40",
    icon: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    value: "text-blue-500",
  },
  success: {
    card: "border-green-500/20 hover:border-green-500/40",
    icon: "bg-green-500/10 text-green-600",
    value: "text-green-600",
  },
  warning: {
    card: "border-yellow-500/20 hover:border-yellow-500/40",
    // yellow-700 in light: yellow-600 is 2.94:1 on a white card, under even
    // the 3:1 large text gets (axe, tests/a11y/admin-and-public.spec.ts).
    icon: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-500",
    value: "text-yellow-700 dark:text-yellow-500",
  },
  danger: {
    card: "border-red-500/20 hover:border-red-500/40",
    icon: "bg-red-500/10 text-red-600 dark:text-red-400",
    value: "text-red-600 dark:text-red-400",
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
        !isPositive && !isNeutral && "text-red-600 dark:text-red-400",
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
  const valueStr = String(value);

  // Check if value is a monetary value (contains R$, US$, EUR, etc.)
  const isMonetary = /^[A-Z]{2,3}\$?\s?[\d.,]+$|^R\$\s?[\d.,]+$/i.test(
    valueStr.trim(),
  );

  // Check if value is a numeric value with decimal separator (like "130,00 L", "4.926,56 L", "45,234 km")
  // Pattern: digits (with optional thousand separators), comma, 2-3 decimal digits, optional space, optional unit
  const isNumericWithDecimal = /^\d[\d.]*,\d{2,3}(\s?[A-Za-z%]+)?$/i.test(
    valueStr.trim(),
  );

  // Check if comma is part of a list (not a decimal separator)
  const hasListCommas =
    valueStr.includes(",") &&
    !isMonetary &&
    !isNumericWithDecimal &&
    valueStr.split(",").length > 1 &&
    valueStr.split(",").some((item) => item.trim().length > 3);

  // Show tooltip if: value is long OR has list commas (but not for monetary/numeric values)
  const shouldShowTooltip = valueStr.length > 20 || hasListCommas;

  // Format tooltip content for better display of comma-separated values
  const formatTooltipContent = () => {
    if (hasListCommas) {
      const items = valueStr.split(",").map((item) => item.trim());
      return (
        <div className="space-y-1.5">
          <p className="text-sm font-semibold mb-2 pb-1.5 border-b border-border">
            {title}
          </p>
          {items.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-2 text-sm font-medium"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      );
    }
    return (
      <div>
        <p className="text-sm font-semibold mb-1">{title}</p>
        <p className="text-base font-medium break-words">{value}</p>
      </div>
    );
  };

  const cardContent = (
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
        {/*
          `line-clamp-2` alone. It used to carry `truncate` as well, and
          `truncate` wins: it sets `white-space: nowrap`, so the two lines the
          clamp allows could never be used. On a 1024px desk that turned every
          card in the product into "Total de..." and "Entregu...", and the
          clamp beside it made it look deliberate.
        */}
        <h3
          className="line-clamp-2 flex-1 text-sm font-medium
          text-muted-foreground"
        >
          {title}
        </h3>
        {Icon && (
          <div className={cn("p-2 rounded-md flex-shrink-0", styles.icon)}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </CardHeader>
      <CardContent
        className="flex-1 flex flex-col
        justify-between"
      >
        <div className={cn("mb-2 truncate text-2xl font-bold", styles.value)}>
          {value}
        </div>
        {(description || trend) && (
          <div
            className="flex items-center
            justify-between gap-2"
          >
            {description && (
              <p className="line-clamp-2 flex-1 text-xs text-muted-foreground">
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
  );

  return (
    <div className="h-full z-40 transition-transform duration-200 ease-out hover:-translate-y-1">
      {shouldShowTooltip ? (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
            <TooltipContent
              side="top"
              className="max-w-sm p-3 bg-popover 
              border-border shadow-lg"
            >
              {formatTooltipContent()}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        cardContent
      )}
    </div>
  );
}

export { StatCard };
