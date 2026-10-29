import type { TutorialConfig, TutorialStep } from "../tutorial-provider.types";

import { accountTours } from "./account";
import { buildAdminTours } from "./admin";
import { dashboardTours } from "./dashboard";
import { deliveriesTours } from "./deliveries";
import { driverTours } from "./driver";
import { fleetTours } from "./fleet";
import { operationsTours } from "./operations";

/**
 * Every tour, keyed by `resolveTutorialKey` (engine/tutorial-key). Steps
 * point at `data-tutorial` anchors only; tests/unitaires/tutorial-anchors
 * checks that each anchor exists in the source of the page it belongs to.
 */
const companyTours: TutorialConfig = {
  ...dashboardTours,
  ...fleetTours,
  ...deliveriesTours,
  ...operationsTours,
};

const tutorialConfigs: TutorialConfig = {
  ...companyTours,
  ...buildAdminTours(companyTours),
  ...driverTours,
  ...accountTours,
};

export { tutorialConfigs };
export type { TutorialStep };
