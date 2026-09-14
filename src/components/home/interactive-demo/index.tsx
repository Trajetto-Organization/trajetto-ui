"use client";

import { useRef, useEffect, useCallback } from "react";
import { Reveal } from "@/components/shared/reveal";

import Image from "next/image";
import trajettoLogo from "@/assets/logo/trajetto-logo.png";

import {
  LineChart,
  BarChart3,
  RefreshCw,
  ChevronRight,
  Search,
  Menu,
  ChartArea,
  Zap,
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
import {
  demoSteps,
  fakeStats,
  fakeActivities,
  fakeQuickLinks,
  sidebarItems,
} from "./data";

import { useDemoNavigation } from "./hooks/demo-navigation";
import { useTooltipPosition } from "./hooks/tooltip-position";

import { useKeyboardNavigation } from "./hooks/keyboard-navigation";
import { FloatingControls } from "./floating-controls";

import { DemoTooltip } from "./demo-tooltip";
import { KeyboardHints } from "./keyboard-hints";

import { StepInformation } from "./step-information";

const InteractiveDemo = (): JSX.Element => {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  // Custom hooks
  const {
    currentStep,
    setCurrentStep,
    isPlaying,
    nextStep,
    prevStep,
    startAutoTour,
    pauseAutoTour,
  } = useDemoNavigation(demoSteps);

  const { tooltipPosition, arrowPosition, arrowConfig, updateTooltipPosition } =
    useTooltipPosition(currentStep, demoSteps, mainRef, tooltipRef);

  useKeyboardNavigation({
    currentStep,
    totalSteps: demoSteps.length,
    isPlaying,
    prevStep,
    nextStep,
    startAutoTour,
    pauseAutoTour,
  });

  // Track pending timeouts to cancel on rapid navigation
  const pendingTimeouts = useRef<NodeJS.Timeout[]>([]);

  const safeTimeout = useCallback((fn: () => void, delay: number) => {
    const id = setTimeout(fn, delay);
    pendingTimeouts.current.push(id);
    return id;
  }, []);

  // Scroll and position management
  useEffect(() => {
    // Cancel all pending timeouts from previous step
    pendingTimeouts.current.forEach(clearTimeout);
    pendingTimeouts.current = [];

    const currentStepData = demoSteps[currentStep];
    if (!currentStepData?.tooltip || !containerRef.current) return;

    const target = containerRef.current.querySelector(
      currentStepData.tooltip.target,
    );

    if (!target) return;

    const scrollArea = containerRef.current.querySelector(
      "[data-radix-scroll-area-viewport]",
    ) as HTMLElement;

    if (!scrollArea) return;

    const handleScrollAndPosition = () => {
      const targetRect = target.getBoundingClientRect();
      const scrollAreaRect = scrollArea.getBoundingClientRect();

      const isVisible =
        targetRect.top >= scrollAreaRect.top &&
        targetRect.bottom <= scrollAreaRect.bottom;

      if (!isVisible) {
        const targetCenter =
          targetRect.top -
          scrollAreaRect.top +
          scrollArea.scrollTop -
          scrollAreaRect.height / 2 +
          targetRect.height / 2;

        // Use instant scroll to avoid timing issues with rapid navigation
        scrollArea.scrollTo({
          top: Math.max(0, targetCenter),
          behavior: "auto",
        });

        safeTimeout(() => {
          updateTooltipPosition();
        }, 50);
      } else {
        safeTimeout(() => {
          updateTooltipPosition();
        }, 10);
      }
    };

    const handleResize = () => {
      safeTimeout(() => {
        updateTooltipPosition();
      }, 50);
    };

    const handleScroll = () => {
      safeTimeout(() => {
        updateTooltipPosition();
      }, 10);
    };

    requestAnimationFrame(() => {
      safeTimeout(handleScrollAndPosition, 10);
    });

    window.addEventListener("resize", handleResize);
    scrollArea.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("resize", handleResize);
      scrollArea.removeEventListener("scroll", handleScroll);
    };
  }, [currentStep, updateTooltipPosition, safeTimeout]);

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
        className="absolute top-20 left-20 w-40 h-40 
        rounded-full bg-[#d81b60]/5 filter blur-3xl"
      />
      <div
        className="absolute bottom-20 right-20 w-60 h-60 
        rounded-full bg-[#d81b60]/5 filter blur-3xl"
      />

      <div className="container px-4 mx-auto relative z-10">
        {/* Header */}
        <div className="text-center space-y-2 mb-16">
          <h2
            className="text-4xl md:text-5xl font-bold pb-2
            bg-clip-text text-transparent bg-gradient-to-r 
            from-foreground to-foreground/70 tracking-tight"
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

        {/* Demo Interface */}
        <div className="max-w-7xl mx-auto">
          {/* `Reveal` wraps rather than replaces this element: the ref is used
              to measure the container for the tooltip positions, and moving it
              onto the animated wrapper would measure the wrong box. */}
          <Reveal direction="scale" duration={800}>
            <div
              ref={containerRef}
              className="relative bg-background rounded-2xl
              shadow-2xl overflow-hidden border border-border/50"
              id="interactive-demo-container"
            >
              {/* Layout with Sidebar */}
              <div
                className="flex h-[400px] sm:h-[500px] 
                md:h-[600px] lg:h-[700px] xl:h-[800px]"
              >
                {/* Sidebar */}
                <div
                  className="hidden lg:flex w-48 xl:w-64 bg-sidebar 
                  border-r border-sidebar-border flex-col overflow-hidden pt-2"
                >
                  {/* Sidebar Header */}
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
                        src={trajettoLogo}
                        alt="Trajetto"
                        width={16}
                        height={16}
                        className="size-3 xl:size-4"
                        placeholder="blur"
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

                  {/* Sidebar Content */}
                  <ScrollArea className="flex-1 px-2 xl:px-3 py-3">
                    <div
                      className="px-2 xl:px-3 text-xs 
                    font-medium text-sidebar-foreground/70 mb-2"
                    >
                      ADMINISTRAÇÃO
                    </div>
                    <div className="space-y-1">
                      {sidebarItems.map((item, index) => (
                        <div
                          key={index}
                          className={`flex items-center rounded-md px-2 
                          xl:px-3 py-1.5 xl:py-2 text-xs xl:text-sm 
                          font-medium ${
                            item.isActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          }`}
                        >
                          <item.icon className="mr-1.5 xl:mr-2 h-3 xl:h-4 w-3 xl:w-4" />
                          <span className="hidden xl:inline">{item.title}</span>
                          {item.shortTitle && (
                            <span className="xl:hidden text-xs">
                              {item.shortTitle}
                            </span>
                          )}
                          {item.hasChevron && (
                            <ChevronRight className="ml-auto h-3 xl:h-4 w-3 xl:w-4" />
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* Sidebar Footer */}
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

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Header */}
                  <header
                    className="flex h-10 sm:h-12 lg:h-14 shrink-0 
                    items-center justify-between gap-2 border-b 
                    border-border px-2 sm:px-4"
                  >
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Menu className="hidden lg:flex -ml-1 h-3 sm:h-4 w-3 sm:w-4" />
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
                        className="h-7 sm:h-9 w-32 sm:w-40 lg:w-64 rounded-md border 
                        border-input bg-background pl-7 sm:pl-9 pr-2 sm:pr-3 text-xs 
                        sm:text-sm ring-offset-background placeholder:text-muted-foreground 
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring 
                        focus-visible:ring-offset-2"
                        placeholder="Buscar..."
                        readOnly
                      />
                    </div>
                  </header>

                  {/* Main Content with ScrollArea */}
                  <ScrollArea className="h-full w-full" ref={scrollAreaRef}>
                    <main
                      ref={mainRef}
                      className="px-2 sm:px-4 lg:px-6 pt-3 
                    sm:pt-4 lg:pt-6 pb-4 sm:pb-6 
                    lg:pb-8 relative"
                    >
                      {/* Tabs */}
                      <div
                        className="flex flex-col gap-2 sm:gap-4 sm:flex-row 
                        sm:items-center sm:justify-between mb-3 sm:mb-4 lg:mb-6"
                        data-demo-target="overview"
                      >
                        <div
                          className="flex bg-muted p-0.5 sm:p-1 
                          rounded-lg w-full sm:w-auto"
                        >
                          <button
                            className="flex items-center space-x-1 
                            flex-1 sm:flex-initial rounded-md bg-background 
                            px-2 sm:px-3 py-1 shadow-sm text-xs sm:text-sm"
                          >
                            <LineChart className="h-3 sm:h-4 w-3 sm:w-4" />
                            <span>Overview</span>
                          </button>
                          <button
                            className="flex items-center space-x-1 flex-1
                            sm:flex-initial px-2 sm:px-3 py-1 text-xs
                            sm:text-sm text-muted-foreground"
                          >
                            <BarChart3 className="h-3 sm:h-4 w-3 sm:w-4" />
                            <span>Análise Gráfica</span>
                          </button>
                          <button
                            className="flex items-center space-x-1 flex-1
                            sm:flex-initial px-2 sm:px-3 py-1 text-xs
                            sm:text-sm text-muted-foreground"
                          >
                            <Zap className="h-3 sm:h-4 w-3 sm:w-4" />
                            <span>Limites de Uso</span>
                          </button>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs sm:text-sm h-7 sm:h-8"
                        >
                          <RefreshCw
                            className="h-3 sm:h-4 w-3 
                          sm:w-4 mr-1 sm:mr-2"
                          />
                          <span className="">Atualizar</span>
                        </Button>
                      </div>

                      {/* Stats Grid */}
                      <div
                        data-demo-target="stats"
                        className={`grid grid-cols-2 gap-1.5 sm:gap-2 lg:gap-4 
                        sm:grid-cols-2 lg:grid-cols-4 mb-3 sm:mb-4 
                        lg:mb-6 transition-all duration-500 ${
                          currentStep === 1
                            ? "ring-2 ring-[#d81b60] rounded-lg p-2 bg-[#d81b60]/5 shadow-lg"
                            : ""
                        }`}
                      >
                        {fakeStats.map((stat, index) => (
                          <Card
                            key={index}
                            className="overflow-hidden 
                            shadow-sm sm:shadow-md"
                          >
                            <div className="flex">
                              <div
                                className="flex w-1/4 items-center 
                              justify-center p-1.5 sm:p-2 lg:p-4"
                                style={{ backgroundColor: stat.color }}
                              >
                                <stat.icon
                                  className="h-2.5 sm:h-3 lg:h-4 
                                w-2.5 sm:w-3 lg:w-4 text-white"
                                />
                              </div>
                              <div className="w-3/4">
                                <CardHeader
                                  className="pb-1 sm:pb-2 pt-1.5 sm:pt-2 
                                lg:pt-4 px-2 sm:px-4 lg:px-6"
                                >
                                  <CardTitle
                                    className="text-xs sm:text-sm 
                                  font-medium leading-tight"
                                  >
                                    {stat.title}
                                  </CardTitle>
                                </CardHeader>
                                <CardContent
                                  className="pb-1.5 sm:pb-2 lg:pb-4 
                                  pt-0 px-2 sm:px-4 lg:px-6"
                                >
                                  <div
                                    className="text-lg sm:text-xl 
                                  lg:text-2xl font-bold"
                                  >
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
                      </div>

                      {/* Recent Activity */}
                      <div
                        data-demo-target="activity"
                        className={`mb-3 sm:mb-4 lg:mb-6 transition-all duration-500 ${
                          currentStep === 2
                            ? "ring-2 ring-[#d81b60] rounded-lg p-2 bg-[#d81b60]/5 shadow-lg"
                            : ""
                        }`}
                      >
                        <Card className="shadow-sm sm:shadow-md">
                          <CardHeader
                            className="pb-2 sm:pb-4 pt-3 sm:pt-4
                          lg:pt-6 px-3 sm:px-4 lg:px-6"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="text-sm sm:text-base lg:text-lg">
                                  Atividades Recentes
                                </CardTitle>
                                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                                  Últimas ações realizadas no sistema
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-7 sm:h-8 hidden sm:flex"
                              >
                                <ChartArea className="h-3 sm:h-4 w-3 sm:w-4 mr-1" />
                                Ver todas
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="px-2 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead
                                      className="text-xs sm:text-sm 
                                      px-1 sm:px-2 lg:px-4"
                                    >
                                      Tipo
                                    </TableHead>
                                    <TableHead
                                      className="w-[30%] sm:w-[25%] text-xs 
                                      sm:text-sm px-1 sm:px-2 lg:px-4"
                                    >
                                      Descrição
                                    </TableHead>
                                    <TableHead
                                      className="hidden lg:table-cell text-xs 
                                      sm:text-sm px-1 sm:px-2 lg:px-4"
                                    >
                                      Nome do usuário
                                    </TableHead>
                                    <TableHead
                                      className="hidden xl:table-cell text-xs 
                                      sm:text-sm px-1 sm:px-2 lg:px-4"
                                    >
                                      E-mail do usuário
                                    </TableHead>
                                    <TableHead
                                      className="text-xs sm:text-sm 
                                      px-1 sm:px-2 lg:px-4"
                                    >
                                      Data
                                    </TableHead>
                                    <TableHead
                                      className="text-xs sm:text-sm 
                                      px-1 sm:px-2 lg:px-4"
                                    >
                                      Status
                                    </TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {fakeActivities.map((activity, index) => (
                                    <TableRow key={index}>
                                      <TableCell
                                        className="font-medium text-xs 
                                      sm:text-sm px-1 sm:px-2 lg:px-4 
                                      py-1.5 sm:py-2"
                                      >
                                        {activity.type}
                                      </TableCell>
                                      <TableCell
                                        className="text-xs sm:text-sm px-1 
                                        sm:px-2 lg:px-4 py-1.5 sm:py-2"
                                      >
                                        {activity.description}
                                      </TableCell>
                                      <TableCell
                                        className="hidden lg:table-cell text-xs 
                                        sm:text-sm px-1 sm:px-2 lg:px-4 py-1.5 sm:py-2"
                                      >
                                        {activity.user}
                                      </TableCell>
                                      <TableCell
                                        className="hidden xl:table-cell text-xs 
                                        sm:text-sm px-1 sm:px-2 lg:px-4 py-1.5 sm:py-2"
                                      >
                                        {activity.email}
                                      </TableCell>
                                      <TableCell
                                        className="text-xs sm:text-sm px-1 
                                        sm:px-2 lg:px-4 py-1.5 sm:py-2"
                                      >
                                        {activity.date}
                                      </TableCell>
                                      <TableCell
                                        className="text-xs sm:text-sm px-1 
                                        sm:px-2 lg:px-4 py-1.5 sm:py-2"
                                      >
                                        {getStatusBadge(activity.status)}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Quick Links */}
                      <div
                        data-demo-target="quicklinks"
                        className={`transition-all duration-500 ${
                          currentStep === 3
                            ? "ring-2 ring-[#d81b60] rounded-lg p-2 bg-[#d81b60]/5 shadow-lg"
                            : ""
                        }`}
                      >
                        <div
                          className="grid grid-cols-2 gap-2 
                        sm:gap-3 lg:gap-4 md:grid-cols-4"
                        >
                          {fakeQuickLinks.map((link, index) => (
                            <Card
                              key={index}
                              className="shadow-sm sm:shadow-md transition-all 
                              hover:bg-muted/50 h-full min-h-[80px] sm:min-h-[100px] 
                              lg:min-h-[120px] xl:min-h-[140px]"
                            >
                              <CardContent
                                className="flex h-full flex-col 
                              items-center justify-center p-2 
                              sm:p-4 lg:p-6 text-center"
                              >
                                <div
                                  className="mb-1 sm:mb-2 lg:mb-3 
                                  rounded-full p-1 sm:p-2 lg:p-3 
                                  flex-shrink-0"
                                  style={{
                                    backgroundColor: `${link.color}20`,
                                    color: link.color,
                                  }}
                                >
                                  <link.icon
                                    className="h-3 sm:h-4 lg:h-5 
                                    xl:h-6 w-3 sm:w-4 lg:w-5 xl:w-6"
                                  />
                                </div>
                                <CardTitle
                                  className="text-xs sm:text-sm 
                                  font-medium leading-tight"
                                >
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
                      </div>

                      {/* Tooltip inside main */}
                      <DemoTooltip
                        ref={tooltipRef}
                        currentStep={demoSteps[currentStep]}
                        tooltipPosition={tooltipPosition}
                        arrowPosition={arrowPosition}
                        arrowConfig={arrowConfig}
                      />
                    </main>
                  </ScrollArea>
                </div>
              </div>

              {/* Floating Controls - Always Visible */}
              <FloatingControls
                currentStep={currentStep}
                totalSteps={demoSteps.length}
                isPlaying={isPlaying}
                onPrevStep={prevStep}
                onNextStep={nextStep}
                onStartAutoTour={startAutoTour}
                onPauseAutoTour={pauseAutoTour}
              />

              {/* Keyboard Shortcuts Hint */}
              <KeyboardHints />
            </div>
          </Reveal>

          {/* Step Information */}
          <StepInformation
            currentStep={currentStep}
            totalSteps={demoSteps.length}
            stepData={demoSteps[currentStep]}
            onStepChange={setCurrentStep}
          />
        </div>
      </div>
    </section>
  );
};

export { InteractiveDemo };
