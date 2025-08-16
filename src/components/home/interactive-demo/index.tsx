"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

import Image from "next/image";
import {
  ArrowRight,
  ArrowLeft,
  Car,
  Users,
  Building2,
  Briefcase,
  Container,
  Package,
  FileText,
  Receipt,
  Play,
  Pause,
  LineChart,
  ChartArea,
  RefreshCw,
  LayoutDashboardIcon,
  Kanban,
  Truck,
  NotepadText,
  ChevronRight,
  Search,
  MenuIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

const InteractiveDemo = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  const tooltipRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const demoSteps = [
    {
      title: "Bem-vindo ao Dashboard",
      description: "Visão geral completa da sua operação em tempo real",
      highlight: "overview",
      tooltip: {
        title: "Dashboard Inteligente",
        content:
          "Monitore todos os aspectos da sua frota em uma única tela centralizada.",
        target: "[data-demo-target='overview']",
      },
    },
    {
      title: "Cards Estatísticos",
      description: "Métricas importantes em tempo real",
      highlight: "stats",
      tooltip: {
        title: "Estatísticas em Tempo Real",
        content:
          "Acompanhe veículos, motoristas, empresas e muito mais com dados atualizados.",
        target: "[data-demo-target='stats']",
      },
    },
    {
      title: "Atividades Recentes",
      description: "Histórico detalhado de todas as ações",
      highlight: "activity",
      tooltip: {
        title: "Monitoramento de Atividades",
        content:
          "Veja quem fez o quê e quando, com rastreamento completo de ações.",
        target: "[data-demo-target='activity']",
      },
    },
    {
      title: "Links Rápidos",
      description: "Acesso direto às funcionalidades principais",
      highlight: "quicklinks",
      tooltip: {
        title: "Navegação Eficiente",
        content: "Acesse rapidamente as seções mais utilizadas do sistema.",
        target: "[data-demo-target='quicklinks']",
      },
    },
  ];

  const fakeStats = [
    { title: "Veículos", value: 24, change: 12, icon: Car, color: "#3b82f6" },
    {
      title: "Motoristas",
      value: 18,
      change: 5,
      icon: Users,
      color: "#10b981",
    },
    {
      title: "Empresas",
      value: 3,
      change: 1,
      icon: Briefcase,
      color: "#8b5cf6",
    },
    {
      title: "Filiais",
      value: 8,
      change: 2,
      icon: Building2,
      color: "#f97316",
    },
    {
      title: "Peças",
      value: 156,
      change: 23,
      icon: Container,
      color: "#ec4899",
    },
    {
      title: "Fornecedores",
      value: 12,
      change: 3,
      icon: Package,
      color: "#6366f1",
    },
    {
      title: "Ordens de Serviço",
      value: 45,
      change: 8,
      icon: FileText,
      color: "#14b8a6",
    },
    { title: "Multas", value: 7, change: -2, icon: Receipt, color: "#dc2626" },
  ];

  const fakeActivities = [
    {
      type: "Veículo",
      description: "Novo veículo ABC-1234 adicionado",
      user: "João Silva",
      email: "joao@empresa.com",
      date: "Hoje, 14:30",
      status: "Criado",
    },
    {
      type: "Multa",
      description: "Multa registrada para veículo XYZ-5678",
      user: "Maria Santos",
      email: "maria@empresa.com",
      date: "Hoje, 13:15",
      status: "Pendente",
    },
    {
      type: "Ordem de serviço",
      description: "Manutenção preventiva concluída",
      user: "Carlos Lima",
      email: "carlos@empresa.com",
      date: "Hoje, 11:45",
      status: "Completo",
    },
    {
      type: "Motorista",
      description: "Perfil de motorista atualizado",
      user: "Ana Costa",
      email: "ana@empresa.com",
      date: "Ontem, 16:20",
      status: "Atualizado",
    },
  ];

  const fakeQuickLinks = [
    { title: "Gerenciar Usuários", icon: Users, color: "#3b82f6" },
    { title: "Veículos", icon: Car, color: "#10b981" },
    { title: "Empresas", icon: Briefcase, color: "#8b5cf6" },
    { title: "Ordens de Serviço", icon: FileText, color: "#f97316" },
    { title: "Motoristas", icon: Users, color: "#ec4899" },
    { title: "Filiais", icon: Building2, color: "#6366f1" },
    { title: "Peças", icon: Container, color: "#14b8a6" },
    { title: "Multas", icon: Receipt, color: "#dc2626" },
  ];

  const nextStep = () => {
    if (currentStep < demoSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const startAutoTour = () => {
    setIsPlaying(true);
    setCurrentStep(0);
  };

  const pauseAutoTour = () => {
    setIsPlaying(false);
  };

  // Simple tooltip positioning with correct scroll behavior
  const updateTooltipPosition = useCallback(() => {
    const currentStepData = demoSteps[currentStep];
    if (
      !currentStepData?.tooltip ||
      !containerRef.current ||
      !tooltipRef.current
    )
      return;

    const target = containerRef.current.querySelector(
      currentStepData.tooltip.target,
    );

    if (!target) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    const tooltipRect = tooltipRef.current.getBoundingClientRect();

    // Calculate position to point to target element (bottom of target)
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetBottom = targetRect.bottom;

    // Position tooltip below target, centered horizontally
    let top = targetBottom - containerRect.top + 16;
    let left = targetCenterX - containerRect.left - tooltipRect.width / 2;

    // Keep tooltip within container horizontally
    const margin = 16;
    left = Math.max(
      margin,
      Math.min(left, containerRect.width - tooltipRect.width - margin),
    );

    // IMPORTANT: Limit tooltip to container bounds (creates "stick to top" behavior)
    top = Math.max(
      margin,
      Math.min(top, containerRect.height - tooltipRect.height - margin),
    );

    setTooltipPosition({ top, left });
  }, [currentStep]);

  // Effect to handle tooltip positioning and scroll listening
  useEffect(() => {
    const currentStepData = demoSteps[currentStep];
    if (!currentStepData?.tooltip) return;

    // Initial position calculation
    const timeoutId = setTimeout(updateTooltipPosition, 100);

    // Add scroll listener to the ScrollArea inside the demo
    const scrollArea = containerRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]",
    );
    if (scrollArea) {
      scrollArea.addEventListener("scroll", updateTooltipPosition, {
        passive: true,
      });
    }

    // Add resize listener
    window.addEventListener("resize", updateTooltipPosition);

    return () => {
      clearTimeout(timeoutId);
      if (scrollArea) {
        scrollArea.removeEventListener("scroll", updateTooltipPosition);
      }
      window.removeEventListener("resize", updateTooltipPosition);
    };
  }, [currentStep, updateTooltipPosition]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev < demoSteps.length - 1) {
            return prev + 1;
          } else {
            setIsPlaying(false);
            return 0;
          }
        });
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Criado":
        return <Badge className="bg-green-600 text-white">Criado</Badge>;
      case "Pendente":
        return <Badge className="bg-yellow-400 text-white">Pendente</Badge>;
      case "Completo":
        return <Badge className="bg-emerald-500 text-white">Completo</Badge>;
      case "Atualizado":
        return <Badge className="bg-indigo-500 text-white">Atualizado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <section
      className="pb-14 pt-20 relative overflow-hidden 
      bg-gradient-to-b from-background 
      via-background/95 to-background"
    >
      {/* Background effects */}
      <div
        className="absolute inset-0 bg-grid-pattern 
        opacity-[0.02] pointer-events-none"
      />
      <div
        className="absolute top-20 left-20 w-40 h-40 ]
        rounded-full bg-[#d81b60]/5 filter blur-3xl"
      />
      <div
        className="absolute bottom-20 right-20 w-60 h-60 
        rounded-full bg-[#d81b60]/5 filter blur-3xl"
      />

      <div
        className="container px-4 
        mx-auto relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-16">
          <h2
            className="text-4xl md:text-5xl pb-3 font-bold mb-3 
            bg-clip-text text-transparent bg-gradient-to-r 
            from-foreground to-foreground/70"
          >
            Explore o Sistema Interativamente
          </h2>
          <p
            className="text-xl text-muted-foreground 
            max-w-3xl mx-auto mb-8"
          >
            Descubra como é simples e intuitivo gerenciar sua frota com nossa
            plataforma completa
          </p>
        </div>

        {/* Demo Interface - Exact Layout Replica */}
        <div className="max-w-7xl mx-auto">
          <motion.div
            ref={containerRef}
            className="relative bg-background rounded-2xl 
            shadow-2xl overflow-hidden border border-border/50"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            id="interactive-demo-container"
          >
            {/* Exact Sidebar + SidebarInset Layout */}
            <div
              className="flex h-[400px] sm:h-[500px] 
              md:h-[600px] lg:h-[700px] xl:h-[800px]"
            >
              {/* Exact Sidebar Replica - Responsive */}
              <div
                className="hidden lg:flex w-48 xl:w-64 bg-sidebar 
                border-r border-sidebar-border flex-col overflow-hidden pt-2"
              >
                {/* Sidebar Header - Exact Replica */}
                <div
                  className="flex gap-2 py-2 
                  text-sidebar-accent-foreground 
                  px-2 xl:px-4"
                >
                  <div
                    className="flex aspect-square size-6 xl:size-8 
                    items-center justify-center rounded-lg 
                    bg-sidebar-primary text-sidebar-primary-foreground"
                  >
                    <Image
                      src="/trajetto-logo.png"
                      alt="Trajetto"
                      width={16}
                      height={16}
                      className="size-3 xl:size-4"
                    />
                  </div>
                  <div
                    className="grid flex-1 text-left 
                    text-xs xl:text-sm leading-tight"
                  >
                    <span className="truncate font-semibold">Trajetto</span>
                    <span className="truncate text-xs">Administrador 👑</span>
                  </div>
                </div>

                {/* Sidebar Content - Exact Menu Structure */}
                <ScrollArea className="flex-1 px-2 xl:px-3 py-3">
                  <div
                    className="px-2 xl:px-3 text-xs 
                    font-medium text-sidebar-foreground/70 mb-2"
                  >
                    ADMINISTRAÇÃO
                  </div>
                  <div className="space-y-1">
                    {/* Dashboard - Active */}
                    <div
                      className="flex items-center rounded-md px-2 
                      xl:px-3 py-1.5 xl:py-2 text-xs xl:text-sm 
                      font-medium bg-sidebar-accent 
                      text-sidebar-accent-foreground"
                    >
                      <LayoutDashboardIcon className="mr-1.5 xl:mr-2 h-3 xl:h-4 w-3 xl:w-4" />
                      <span className="hidden xl:inline">Dashboard</span>
                      <span className="xl:hidden text-xs">Dash</span>
                    </div>

                    {/* Kanban */}
                    <div
                      className="flex items-center rounded-md px-2 
                      xl:px-3 py-1.5 xl:py-2 text-xs xl:text-sm 
                      font-medium text-sidebar-foreground/70 
                      hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    >
                      <Kanban className="mr-1.5 xl:mr-2 h-3 xl:h-4 w-3 xl:w-4" />
                      <span className="hidden xl:inline">Kanban</span>
                    </div>

                    {/* Multas */}
                    <div
                      className="flex items-center rounded-md 
                      px-2 xl:px-3 py-1.5 xl:py-2 text-xs xl:text-sm 
                      font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent 
                      hover:text-sidebar-accent-foreground"
                    >
                      <NotepadText className="mr-1.5 xl:mr-2 h-3 xl:h-4 w-3 xl:w-4" />
                      <span className="hidden xl:inline">Multas</span>
                    </div>

                    {/* Empresas Group */}
                    <div
                      className="flex items-center rounded-md px-2 
                      xl:px-3 py-1.5 xl:py-2 text-xs xl:text-sm font-medium 
                      text-sidebar-foreground/70 hover:bg-sidebar-accent 
                      hover:text-sidebar-accent-foreground"
                    >
                      <Building2 className="mr-1.5 xl:mr-2 h-3 xl:h-4 w-3 xl:w-4" />
                      <span className="hidden xl:inline">Empresas</span>
                      <ChevronRight className="ml-auto h-3 xl:h-4 w-3 xl:w-4" />
                    </div>

                    {/* Usuários Group */}
                    <div
                      className="flex items-center rounded-md px-2 
                      xl:px-3 py-1.5 xl:py-2 text-xs xl:text-sm font-medium 
                      text-sidebar-foreground/70 hover:bg-sidebar-accent 
                      hover:text-sidebar-accent-foreground"
                    >
                      <Users className="mr-1.5 xl:mr-2 h-3 xl:h-4 w-3 xl:w-4" />
                      <span className="hidden xl:inline">Usuários</span>
                      <ChevronRight className="ml-auto h-3 xl:h-4 w-3 xl:w-4" />
                    </div>

                    {/* Veículos Group */}
                    <div
                      className="flex items-center rounded-md px-2 
                      xl:px-3 py-1.5 xl:py-2 text-xs xl:text-sm font-medium 
                      text-sidebar-foreground/70 hover:bg-sidebar-accent 
                      hover:text-sidebar-accent-foreground"
                    >
                      <Truck className="mr-1.5 xl:mr-2 h-3 xl:h-4 w-3 xl:w-4" />
                      <span className="hidden xl:inline">Veículos</span>
                      <ChevronRight className="ml-auto h-3 xl:h-4 w-3 xl:w-4" />
                    </div>
                  </div>
                </ScrollArea>

                {/* Sidebar Footer - Exact User Menu */}
                <div className="mt-auto p-2 xl:p-3">
                  <div
                    className="flex items-center gap-1 xl:gap-2 
                    rounded-md px-2 xl:px-3 py-1.5 xl:py-2 
                    hover:bg-sidebar-accent"
                  >
                    <div
                      className="flex h-6 w-6 xl:h-8 xl:w-8 items-center 
                      justify-center rounded-lg bg-sidebar-primary 
                      text-sidebar-primary-foreground 
                      text-xs font-bold"
                    >
                      JS
                    </div>
                    <div
                      className="grid flex-1 text-left 
                      text-xs xl:text-sm leading-tight"
                    >
                      <span className="truncate font-semibold hidden xl:block">
                        João Silva
                      </span>
                      <span className="truncate text-xs hidden xl:block">
                        joao@empresa.com
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SidebarInset - Main Content Area */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header - Exact Navbar */}
                <header
                  className="flex h-10 sm:h-12 lg:h-14 shrink-0 
                  items-center justify-between gap-2 border-b 
                  border-border px-2 sm:px-4"
                >
                  <div className="flex items-center gap-1 sm:gap-2">
                    <MenuIcon className="hidden lg:flex -ml-1 h-3 sm:h-4 w-3 sm:w-4" />
                    <div className="hidden lg:flex h-3 sm:h-4 w-px bg-border" />
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      Dashboard
                    </div>
                  </div>
                  <div className="relative ">
                    <Search
                      className="absolute left-2 sm:left-3 top-1/2 h-3 
                      sm:h-4 w-3 sm:w-4 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                      className="h-7 sm:h-9 w-32 sm:w-40 lg:w-64 rounded-md border border-input bg-background pl-7 sm:pl-9 pr-2 sm:pr-3 text-xs sm:text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      placeholder="Buscar..."
                      readOnly
                    />
                  </div>
                </header>

                {/* Main Content */}
                <ScrollArea className="h-full w-full">
                  <main className="px-2 sm:px-4 lg:px-6 pt-3 sm:pt-4 lg:pt-6 pb-4 sm:pb-6 lg:pb-8">
                    {/* Tabs - Exact Layout */}
                    <div
                      className="flex flex-col gap-2 sm:gap-4 sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 lg:mb-6"
                      data-demo-target="overview"
                    >
                      <div className="flex bg-muted p-0.5 sm:p-1 rounded-lg w-full sm:w-auto">
                        <button className="flex items-center space-x-1 flex-1 sm:flex-initial rounded-md bg-background px-2 sm:px-3 py-1 shadow-sm text-xs sm:text-sm">
                          <LineChart className="h-3 sm:h-4 w-3 sm:w-4" />
                          <span>Overview</span>
                        </button>
                        <button className="flex items-center space-x-1 flex-1 sm:flex-initial px-2 sm:px-3 py-1 text-xs sm:text-sm text-muted-foreground">
                          <ChartArea className="h-3 sm:h-4 w-3 sm:w-4" />
                          <span>Análise Gráfica</span>
                        </button>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs sm:text-sm h-7 sm:h-8"
                      >
                        <RefreshCw className="h-3 sm:h-4 w-3 sm:w-4 mr-1 sm:mr-2" />
                        <span className="">Atualizar</span>
                      </Button>
                    </div>

                    {/* Stats Grid - Exact StatCard Layout */}
                    <motion.div
                      data-demo-target="stats"
                      className={`grid grid-cols-2 gap-1.5 sm:gap-2 lg:gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-3 sm:mb-4 lg:mb-6 transition-all duration-500 ${
                        currentStep === 1
                          ? "ring-1 sm:ring-2 ring-[#d81b60] rounded-lg p-1 sm:p-2 bg-[#d81b60]/5"
                          : ""
                      }`}
                    >
                      {fakeStats.map((stat, index) => (
                        <Card
                          key={index}
                          className="overflow-hidden shadow-sm sm:shadow-md"
                        >
                          <div className="flex">
                            <div
                              className="flex w-1/4 items-center justify-center p-1.5 sm:p-2 lg:p-4"
                              style={{ backgroundColor: stat.color }}
                            >
                              <stat.icon className="h-2.5 sm:h-3 lg:h-4 w-2.5 sm:w-3 lg:w-4 text-white" />
                            </div>
                            <div className="w-3/4">
                              <CardHeader className="pb-1 sm:pb-2 pt-1.5 sm:pt-2 lg:pt-4 px-2 sm:px-4 lg:px-6">
                                <CardTitle className="text-xs sm:text-sm font-medium leading-tight">
                                  {stat.title}
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="pb-1.5 sm:pb-2 lg:pb-4 pt-0 px-2 sm:px-4 lg:px-6">
                                <div className="text-lg sm:text-xl lg:text-2xl font-bold">
                                  {stat.value}
                                </div>
                                <p
                                  className={`mt-0.5 sm:mt-1 text-xs leading-tight ${
                                    stat.change > 0
                                      ? "text-green-600"
                                      : stat.change < 0
                                        ? "text-red-600"
                                        : "text-gray-500"
                                  }`}
                                >
                                  <span className="hidden sm:inline">
                                    {stat.change > 0 ? "+" : ""}
                                    {stat.change}% em relação ao mês passado
                                  </span>
                                  <span className="sm:hidden">
                                    {stat.change > 0 ? "+" : ""}
                                    {stat.change}%
                                  </span>
                                </p>
                              </CardContent>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </motion.div>

                    {/* Recent Activity - Exact Table Layout */}
                    <motion.div
                      data-demo-target="activity"
                      className={`mb-3 sm:mb-4 lg:mb-6 transition-all duration-500 ${
                        currentStep === 2
                          ? "ring-1 sm:ring-2 ring-[#d81b60] rounded-lg p-1 sm:p-2 bg-[#d81b60]/5"
                          : ""
                      }`}
                    >
                      <Card className="shadow-sm sm:shadow-md">
                        <CardHeader className="pb-2 sm:pb-4 pt-3 sm:pt-4 lg:pt-6 px-3 sm:px-4 lg:px-6">
                          <CardTitle className="text-sm sm:text-base lg:text-lg">
                            Atividades Recentes
                          </CardTitle>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            Últimas ações realizadas no sistema
                          </p>
                        </CardHeader>
                        <CardContent className="px-2 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-xs sm:text-sm px-1 sm:px-2 lg:px-4">
                                    Tipo
                                  </TableHead>
                                  <TableHead className="w-[30%] sm:w-[25%] text-xs sm:text-sm px-1 sm:px-2 lg:px-4">
                                    Descrição
                                  </TableHead>
                                  <TableHead className="hidden lg:table-cell text-xs sm:text-sm px-1 sm:px-2 lg:px-4">
                                    Nome do usuário
                                  </TableHead>
                                  <TableHead className="hidden xl:table-cell text-xs sm:text-sm px-1 sm:px-2 lg:px-4">
                                    E-mail do usuário
                                  </TableHead>
                                  <TableHead className="text-xs sm:text-sm px-1 sm:px-2 lg:px-4">
                                    Data
                                  </TableHead>
                                  <TableHead className="text-xs sm:text-sm px-1 sm:px-2 lg:px-4">
                                    Status
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {fakeActivities.map((activity, index) => (
                                  <TableRow key={index}>
                                    <TableCell className="font-medium text-xs sm:text-sm px-1 sm:px-2 lg:px-4 py-1.5 sm:py-2">
                                      {activity.type}
                                    </TableCell>
                                    <TableCell className="text-xs sm:text-sm px-1 sm:px-2 lg:px-4 py-1.5 sm:py-2">
                                      {activity.description}
                                    </TableCell>
                                    <TableCell className="hidden lg:table-cell text-xs sm:text-sm px-1 sm:px-2 lg:px-4 py-1.5 sm:py-2">
                                      {activity.user}
                                    </TableCell>
                                    <TableCell className="hidden xl:table-cell text-xs sm:text-sm px-1 sm:px-2 lg:px-4 py-1.5 sm:py-2">
                                      {activity.email}
                                    </TableCell>
                                    <TableCell className="text-xs sm:text-sm px-1 sm:px-2 lg:px-4 py-1.5 sm:py-2">
                                      {activity.date}
                                    </TableCell>
                                    <TableCell className="text-xs sm:text-sm px-1 sm:px-2 lg:px-4 py-1.5 sm:py-2">
                                      {getStatusBadge(activity.status)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>

                    {/* Quick Links - Exact Layout */}
                    <motion.div
                      data-demo-target="quicklinks"
                      className={`transition-all duration-500 ${
                        currentStep === 3
                          ? "ring-1 sm:ring-2 ring-[#d81b60] rounded-lg p-1 sm:p-2 bg-[#d81b60]/5"
                          : ""
                      }`}
                    >
                      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:gap-4 md:grid-cols-4">
                        {fakeQuickLinks.map((link, index) => (
                          <Card
                            key={index}
                            className="shadow-sm sm:shadow-md transition-all hover:bg-muted/50 h-full min-h-[80px] sm:min-h-[100px] lg:min-h-[120px] xl:min-h-[140px]"
                          >
                            <CardContent className="flex h-full flex-col items-center justify-center p-2 sm:p-4 lg:p-6 text-center">
                              <div
                                className="mb-1 sm:mb-2 lg:mb-3 rounded-full p-1 sm:p-2 lg:p-3 flex-shrink-0"
                                style={{
                                  backgroundColor: `${link.color}20`,
                                  color: link.color,
                                }}
                              >
                                <link.icon className="h-3 sm:h-4 lg:h-5 xl:h-6 w-3 sm:w-4 lg:w-5 xl:w-6" />
                              </div>
                              <CardTitle className="text-xs sm:text-sm font-medium leading-tight">
                                <span className="hidden sm:inline">
                                  {link.title}
                                </span>
                                <span className="sm:hidden text-xs">
                                  {link.title.split(" ")[0]}
                                </span>
                              </CardTitle>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </motion.div>
                  </main>
                </ScrollArea>
              </div>
            </div>

            {/* Simple Interactive Tooltip */}
            <AnimatePresence>
              {demoSteps[currentStep]?.tooltip && (
                <motion.div
                  ref={tooltipRef}
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 20 }}
                  transition={{ type: "spring", damping: 20, stiffness: 300 }}
                  className="absolute bg-[#d81b60] text-white p-3 sm:p-4 rounded-xl shadow-2xl max-w-xs z-50 pointer-events-none"
                  style={{
                    top: tooltipPosition.top,
                    left: tooltipPosition.left,
                  }}
                >
                  <div className="font-semibold mb-2 text-xs sm:text-sm">
                    {demoSteps[currentStep].tooltip.title}
                  </div>
                  <div className="text-xs opacity-90 leading-relaxed">
                    {demoSteps[currentStep].tooltip.content}
                  </div>
                  <div className="absolute w-3 h-3 bg-[#d81b60] transform rotate-45 -bottom-1.5 left-1/2 -translate-x-1/2"></div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Navigation - Completely Reorganized Layout */}
          <div className="mt-6 sm:mt-8 lg:mt-10">
            {/* Desktop Layout - Everything on same lines */}
            <div className="hidden lg:block">
              {/* Title and Description with Navigation Buttons on same line */}
              <div className="flex items-center justify-between mb-6">
                <div className="text-left flex-1">
                  <div className="text-xl xl:text-2xl font-bold mb-2 text-foreground">
                    {demoSteps[currentStep]?.title}
                  </div>
                  <div className="text-base xl:text-lg text-muted-foreground leading-relaxed">
                    {demoSteps[currentStep]?.description}
                  </div>
                </div>

                {/* Navigation Buttons on the right */}
                <div className="flex items-center gap-4 ml-8">
                  <Button
                    variant="outline"
                    onClick={prevStep}
                    disabled={currentStep === 0}
                    className="flex items-center space-x-2 min-w-[120px] h-11 border-2 hover:bg-muted transition-all duration-200"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="font-medium">Anterior</span>
                  </Button>

                  <Button
                    onClick={nextStep}
                    disabled={currentStep === demoSteps.length - 1}
                    className="flex items-center space-x-2 bg-[#d81b60] hover:bg-[#c2185b] text-white min-w-[120px] h-11 shadow-lg hover:shadow-xl transition-all duration-200 font-medium"
                  >
                    <span>Próximo</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Step Indicators and Auto Tour on same line */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 bg-muted p-2 rounded-full">
                  {demoSteps.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentStep(index)}
                      className={`w-3.5 h-3.5 rounded-full transition-all duration-300 hover:scale-110 ${
                        index === currentStep
                          ? "bg-[#d81b60] shadow-lg"
                          : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                      }`}
                      aria-label={`Ir para passo ${index + 1}`}
                    />
                  ))}
                </div>

                <Button
                  variant="ghost"
                  onClick={isPlaying ? pauseAutoTour : startAutoTour}
                  className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-4 h-4" />
                      <span className="text-sm">Pausar Tour</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span className="text-sm">Tour Automático</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Mobile/Tablet Layout - Stacked */}
            <div className="lg:hidden space-y-4">
              {/* Step Info */}
              <div className="text-center px-4">
                <div className="text-lg sm:text-xl font-bold mb-2 text-foreground">
                  {demoSteps[currentStep]?.title}
                </div>
                <div className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {demoSteps[currentStep]?.description}
                </div>
              </div>

              {/* Step Indicators */}
              <div className="flex justify-center">
                <div className="flex items-center space-x-2 sm:space-x-3 bg-muted p-1.5 sm:p-2 rounded-full">
                  {demoSteps.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentStep(index)}
                      className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all duration-300 hover:scale-110 ${
                        index === currentStep
                          ? "bg-[#d81b60] shadow-lg"
                          : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                      }`}
                      aria-label={`Ir para passo ${index + 1}`}
                    />
                  ))}
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4">
                <Button
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className="flex items-center space-x-2 w-full sm:w-auto min-w-[120px] h-10 sm:h-11 order-2 sm:order-1 border-2 hover:bg-muted transition-all duration-200"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="font-medium">Anterior</span>
                </Button>

                <Button
                  onClick={nextStep}
                  disabled={currentStep === demoSteps.length - 1}
                  className="flex items-center space-x-2 bg-[#d81b60] hover:bg-[#c2185b] text-white w-full sm:w-auto min-w-[120px] h-10 sm:h-11 order-1 sm:order-2 shadow-lg hover:shadow-xl transition-all duration-200 font-medium"
                >
                  <span>Próximo</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Auto Tour Controls */}
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  onClick={isPlaying ? pauseAutoTour : startAutoTour}
                  className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-3 sm:w-4 h-3 sm:h-4" />
                      <span className="text-xs sm:text-sm">Pausar Tour</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 sm:w-4 h-3 sm:h-4" />
                      <span className="text-xs sm:text-sm">
                        Tour Automático
                      </span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export { InteractiveDemo };
