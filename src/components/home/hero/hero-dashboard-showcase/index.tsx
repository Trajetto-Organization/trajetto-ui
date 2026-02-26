"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
}) => {
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

  return (
    <div className="flex flex-col gap-2 sm:gap-3">
      <AnimatePresence mode="popLayout">
        {itemsToShow.map((item, itemIndex) => (
          <motion.div
            key={(item as React.ReactElement).key}
            initial={{ scale: 0, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: -20 }}
            transition={{
              type: "spring",
              stiffness: 350,
              damping: 40,
              delay: itemIndex * 0.1,
            }}
            layout
            className="w-full"
          >
            {item}
          </motion.div>
        ))}
      </AnimatePresence>
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
    <motion.div
      className={`flex items-center space-x-2 
      sm:space-x-3 p-1.5 sm:p-2 rounded-lg ${bgColor}`}
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 20, opacity: 0 }}
      transition={{ type: "spring", stiffness: 350, damping: 40 }}
    >
      <IconComponent
        className={`w-3 h-3 sm:w-4 sm:h-4 ${iconColor} flex-shrink-0`}
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm font-medium truncate">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
      </div>
    </motion.div>
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
      },
    },
  };

  const pulseVariants = {
    pulse: {
      scale: [1, 1.05, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto mt-9">
      <motion.div
        className="relative overflow-hidden rounded-xl border bg-gradient-to-br
        from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800
        p-4 sm:p-5 md:p-6 shadow-2xl lg:h-[440px] flex flex-col"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
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
        <motion.div
          className="relative z-10 flex items-center
          justify-between mb-4 sm:mb-5 md:mb-6"
          variants={itemVariants}
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
            <motion.div
              className="w-2 h-2 bg-green-500 rounded-full"
              variants={pulseVariants}
              animate="pulse"
            />
            <span className="text-xs text-muted-foreground">Online</span>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 
          gap-2 sm:gap-3 mb-4 sm:mb-5"
          variants={itemVariants}
        >
          {statsCards.map((card, index) => {
            const IconComponent = card.icon;
            return (
              <motion.div
                key={index}
                className="bg-white dark:bg-slate-800 
                rounded-lg p-2 sm:p-3 shadow-sm border"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
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
              </motion.div>
            );
          })}
        </motion.div>

        {/* Main Content - Activities */}
        <motion.div
          className="bg-white dark:bg-slate-800
          rounded-lg p-3 sm:p-4 shadow-sm border flex-1"
          variants={itemVariants}
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
        </motion.div>

        {/* Floating Elements */}
        <motion.div
          className="absolute top-4 right-4 w-3 h-3 
          bg-green-400 rounded-full opacity-60"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.6, 1, 0.6],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.div
          className="absolute bottom-4 left-4 w-2 h-2 
          bg-blue-400 rounded-full opacity-40"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />
      </motion.div>
    </div>
  );
};

export { HeroDashboardShowcase };
