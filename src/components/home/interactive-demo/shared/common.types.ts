interface TooltipConfig {
  title: string;
  content: string;
  target: string;
  preferredPosition?: "top" | "bottom" | "left" | "right";
}

interface DemoStep {
  title: string;
  description: string;
  highlight: string;
  tooltip: TooltipConfig;
}

interface TooltipPosition {
  top: number;
  left: number;
}

interface ArrowPosition {
  left: string;
  top: string;
}

interface ArrowConfig {
  position: string;
  border: string;
  transform: string;
  transparentBorders: string;
  isVertical: boolean;
}

interface StatCard {
  title: string;
  value: number;
  change: number;
  icon: any;
  color: string;
}

interface Activity {
  type: string;
  description: string;
  user: string;
  email: string;
  date: string;
  status: string;
}

interface QuickLink {
  title: string;
  icon: any;
  color: string;
}

interface SidebarItem {
  title: string;
  shortTitle?: string;
  icon: any;
  isActive?: boolean;
  hasChevron?: boolean;
}

export type {
  TooltipConfig,
  DemoStep,
  TooltipPosition,
  ArrowPosition,
  ArrowConfig,
  StatCard,
  Activity,
  QuickLink,
  SidebarItem,
};
