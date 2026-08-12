"use client";

import React, { useEffect, useMemo, useState } from "react";

import { usePresenceList } from "@/hooks/use-presence-list";
import Image from "next/image";

import {
  Car,
  Clock,
  CheckCircle,
  AlertTriangle,
  Settings,
  Building2,
  Receipt,
  Container,
} from "lucide-react";

const DashboardAnimatedList = ({
  children,
  delay = 2500,
  maxItems = 3,
}: {
  children: React.ReactNode;
  delay?: number;
  maxItems?: number;
}): JSX.Element => {
  const [index, setIndex] = useState<number>(0);
  const childrenArray = React.Children.toArray(children);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prevIndex) => (prevIndex + 1) % childrenArray.length);
    }, delay);

    return () => clearInterval(interval);
  }, [childrenArray.length, delay]);

  const itemsToShow = useMemo(() => {
    const startIndex = Math.max(0, index + 1 - maxItems);
    const endIndex = index + 1;

    return childrenArray.slice(startIndex, endIndex).reverse();
  }, [index, childrenArray, maxItems]);

  // Items that just left stay mounted while they collapse, so the rows below
  // slide up instead of snapping into place.
  const entries = usePresenceList(itemsToShow, (item) =>
    String((item as React.ReactElement).key),
  );

  return (
    <div className="flex flex-col gap-2 sm:gap-3">
      {entries.map(({ key, item, exiting }, entryIndex) => (
        <div
          key={key}
          data-exiting={exiting}
          className="stack-item stack-item-rise w-full"
          style={{ transitionDelay: exiting ? "0ms" : `${entryIndex * 100}ms` }}
        >
          <div>{item}</div>
        </div>
      ))}
    </div>
  );
};

interface ActivityProps {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
  iconColor: string;
}

const Activity = ({
  title,
  subtitle,
  icon: IconComponent,
  bgColor,
  iconColor,
}: ActivityProps): JSX.Element => {
  return (
    // Layered on purpose, as in the original: the row grows and rises while
    // the content inside slides in from the left. Two movements at once is
    // what gives this list its character.
    <div
      className={`animate-fade-left flex items-center space-x-2
      sm:space-x-3 p-1.5 sm:p-2 rounded-lg ${bgColor}`}
    >
      <IconComponent
        className={`w-3 h-3 sm:w-4 sm:h-4 ${iconColor} flex-shrink-0`}
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm font-medium truncate">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
      </div>
    </div>
  );
};

const HeroDashboardShowcase = (): JSX.Element => {
  // Data for stats cards
  const statsCards = [
    {
      title: "Veículos",
      value: "127",
      icon: Car,
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Peças",
      value: "89",
      icon: Container,
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
      iconColor: "text-purple-600 dark:text-purple-400",
    },
    {
      title: "Multas",
      value: "8",
      icon: Receipt,
      bgColor: "bg-red-100 dark:bg-red-900/30",
      iconColor: "text-red-600 dark:text-red-400",
    },
    {
      title: "Filiais",
      value: "42",
      icon: Building2,
      bgColor: "bg-green-100 dark:bg-green-900/30",
      iconColor: "text-green-600 dark:text-green-400",
    },
  ];

  // Data for activities
  const activities = [
    {
      title: "Abastecimento registrado",
      subtitle: "Veículo ABC-1234 • Há 5 min",
      icon: CheckCircle,
      bgColor: "bg-green-50 dark:bg-green-900/20",
      iconColor: "text-green-500",
    },
    {
      title: "Ordem de serviço criada",
      subtitle: "Manutenção preventiva • Há 12 min",
      icon: Settings,
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      iconColor: "text-blue-500",
    },
    {
      title: "Nova peça criada",
      subtitle: "Peça cadastrada com sucesso • Há 1h",
      icon: Container,
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
      iconColor: "text-purple-500",
    },
    {
      title: "Multa registrada",
      subtitle: "Excesso de velocidade • Há 2h",
      icon: AlertTriangle,
      bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
      iconColor: "text-yellow-500",
    },
    {
      title: "Manutenção concluída",
      subtitle: "Veículo XYZ-9876 • Há 3h",
      icon: CheckCircle,
      bgColor: "bg-green-50 dark:bg-green-900/20",
      iconColor: "text-green-500",
    },
    {
      title: "Novo veículo adicionado",
      subtitle: "Toyota Corolla 2024 • Há 4h",
      icon: Car,
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      iconColor: "text-blue-500",
    },
  ];

  return (
    <div className="relative w-full max-w-4xl mx-auto mt-9">
      <div
        className="animate-fade-up relative overflow-hidden rounded-xl border
        bg-gradient-to-br
        from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800
        p-4 sm:p-5 md:p-6 shadow-2xl lg:h-[440px] flex flex-col"
      >
        {/* Background Grid */}
        <div
          className="absolute inset-0 opacity-20 dark:opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
            `,
            backgroundSize: "20px 20px",
          }}
        />

        {/* Header */}
        <div
          className="animate-fade-up [animation-delay:200ms] relative z-10 flex items-center
          justify-between mb-4 sm:mb-5 md:mb-6"
        >
          <div className="flex items-center space-x-3">
            <div
              className="w-10 h-10 rounded-lg overflow-hidden 
              flex items-center justify-center bg-white shadow-sm"
            >
              <Image
                src="/trajetto-logo.png"
                alt="Trajetto Logo"
                width={32}
                height={32}
                className="object-contain"
                priority
              />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Trajetto</h3>
              <p className="text-xs text-muted-foreground">
                Dashboard Executivo
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="animate-pulse-scale-sm w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-xs text-muted-foreground">Online</span>
          </div>
        </div>

        {/* Stats Cards */}
        <div
          className="animate-fade-up [animation-delay:300ms] grid grid-cols-2 lg:grid-cols-4 
          gap-2 sm:gap-3 mb-4 sm:mb-5"
        >
          {statsCards.map((card, index) => {
            const IconComponent = card.icon;
            return (
              <div
                key={index}
                className="bg-white dark:bg-slate-800
                rounded-lg p-2 sm:p-3 shadow-sm border
                transition-transform duration-200 hover:scale-[1.02]"
              >
                <div
                  className="flex items-center 
                  space-x-1.5 sm:space-x-2"
                >
                  <div
                    className={`w-6 h-6 sm:w-8 sm:h-8 ${card.bgColor} 
                    rounded-lg flex items-center justify-center`}
                  >
                    <IconComponent
                      className={`w-3 h-3 sm:w-4 sm:h-4 ${card.iconColor}`}
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {card.title}
                    </p>
                    <p className="font-bold text-xs sm:text-sm">{card.value}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Main Content - Activities */}
        <div
          className="animate-fade-up [animation-delay:400ms] bg-white dark:bg-slate-800
          rounded-lg p-3 sm:p-4 shadow-sm border flex-1"
        >
          <div
            className="flex items-center 
            justify-between mb-3 sm:mb-4"
          >
            <h4
              className="font-semibold text-xs sm:text-sm
              flex items-center space-x-1.5 sm:space-x-2"
            >
              <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Atividades Recentes</span>
            </h4>
            <span
              className="text-xs text-blue-600 
              font-medium hidden sm:block"
            >
              Ações realizadas no sistema
            </span>
          </div>
          <div
            className="h-[150px] sm:h-[170px] overflow-hidden
            [mask-image:linear-gradient(to_bottom,#000_70%,transparent_100%)]"
          >
            <DashboardAnimatedList delay={2500} maxItems={3}>
              {activities.map((activity, index) => (
                <Activity
                  key={`activity-${index}`}
                  title={activity.title}
                  subtitle={activity.subtitle}
                  icon={activity.icon}
                  bgColor={activity.bgColor}
                  iconColor={activity.iconColor}
                />
              ))}
            </DashboardAnimatedList>
          </div>
        </div>

        {/* Floating Elements */}
        <div
          className="animate-pulse-scale absolute top-4 right-4 w-3 h-3
          bg-green-400 rounded-full"
        />

        <div
          className="animate-pulse-scale absolute bottom-4 left-4 w-2 h-2
          bg-blue-400 rounded-full [animation-duration:3s]"
          style={{ animationDelay: "1s" }}
        />
      </div>
    </div>
  );
};

export { HeroDashboardShowcase };
