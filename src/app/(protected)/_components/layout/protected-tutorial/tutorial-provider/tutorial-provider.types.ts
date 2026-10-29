import type {
  Permission,
  UserRole,
} from "@/app/(protected)/_components/shared/common.types";

import type { PreferredPlacement } from "../engine/placement";

/**
 * Another anchor for the same step, tried in order when the ones before it
 * are not on screen — e.g. the ⋮ of the first row, else the empty table.
 * Title and content override the step's own when this variant is the one
 * shown, so an empty table is explained instead of pointed at a missing row.
 */
interface TutorialStepVariant {
  anchor: string;
  title?: string;
  content?: string;
}

interface TutorialStep {
  /**
   * The `data-tutorial` value this step points at — never a CSS selector,
   * an ARIA role or a tag path (decision 9.1). Omitted = a centered step.
   */
  anchor?: string;
  variants?: TutorialStepVariant[];
  title: string;
  content: string;
  placement?: PreferredPlacement;
  spotlightPadding?: number;
  /**
   * Dropped from the tour when none of its anchors renders (a tab the
   * profile cannot see, a card the module hides) — judged when the tour
   * starts if the page has settled, else when the walk reaches the step.
   * A required step whose anchor is missing is shown centered instead.
   */
  optional?: boolean;
  /**
   * When no anchor renders, show the step centered as an intended
   * explanation (status "centered", no warning) instead of dropping it or
   * flagging it missing — for elements that exist only in some states.
   */
  centerWhenMissing?: boolean;
  /**
   * Kept only when this session can open that path, through the same
   * `canAccessPath` the sidebar and the dashboard cards use.
   */
  requiresPath?: string;
  /** What the phone variant does before showing this step. */
  mobile?: {
    /** The step explains the sidebar: open it (it is a drawer on a phone). */
    openSidebar?: boolean;
  };
}

interface TutorialConfig {
  [key: string]: TutorialStep[];
}

/** The session, as the tours need it. */
interface TutorialUser {
  id?: string | null;
  role: UserRole;
  /** Profile rows of a BUSINESS_USER; ignored for the other roles. */
  permissions?: Permission[];
  enabledModules?: string[] | null;
  isDriver?: boolean;
}

interface TutorialContextType {
  isActive: boolean;
  currentStep: number;
  steps: TutorialStep[];
  /** The tour that applies to the screen on display ("" when none). */
  tourKey: string;
  /** Whether the screen on display has a tour this session can open. */
  hasTour: boolean;
  /**
   * False while the tours' copy is still loading (a separate chunk, fetched
   * after the page is up); `hasTour` is false meanwhile.
   */
  toursReady: boolean;
  /** Restarts the tour of the current screen, seen or not. */
  startTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
  /** Removes an optional step whose anchor never rendered (see `optional`). */
  dropStep: (index: number) => void;
  skipTutorial: () => void;
  setCurrentTab: (tab: string) => void;
  currentTab: string;
}

interface TutorialProviderProps {
  children: React.ReactNode;
  user?: TutorialUser;
}

export type {
  TutorialUser,
  TutorialStep,
  TutorialStepVariant,
  TutorialContextType,
  TutorialProviderProps,
  TutorialConfig,
};
