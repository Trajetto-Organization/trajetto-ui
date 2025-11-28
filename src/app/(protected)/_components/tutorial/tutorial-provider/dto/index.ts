import { UserRole } from "../../../dto";

interface TutorialStep {
  target: string;
  title: string;
  content: string;
  placement?: "top" | "bottom" | "left" | "right" | "center";
  spotlightPadding?: number;
  disableInteraction?: boolean;
  condition?: (
    userPermissions?: UserPermissions,
    currentTab?: string,
  ) => boolean;
}

interface TutorialConfig {
  [key: string]: TutorialStep[];
}

interface UserPermissions {
  role: UserRole;
  permissions?: Array<{
    permissionKey: string;
    canRead: boolean;
    canWrite: boolean;
  }>;
}

interface TutorialContextType {
  isActive: boolean;
  currentStep: number;
  steps: TutorialStep[];
  startTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
  resetTutorial: () => void;
  setCurrentTab: (tab: string) => void;
  currentTab: string;
}

interface TutorialProviderProps {
  children: React.ReactNode;
  userPermissions?: UserPermissions;
}

export type {
  UserPermissions,
  TutorialStep,
  TutorialContextType,
  TutorialProviderProps,
  TutorialConfig,
};
