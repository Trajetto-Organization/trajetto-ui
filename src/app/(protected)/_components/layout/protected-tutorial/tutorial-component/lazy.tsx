"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

import { useTutorial } from "../tutorial-provider";

const TutorialComponent = dynamic(() => import("./index"), { ssr: false });

/**
 * The tour card and its placement engine, loaded the first time a tour opens
 * rather than with every protected page. It stays mounted afterwards: closing
 * a tour runs effects of its own (it closes the drawer it opened on a phone).
 */
const LazyTutorialComponent = (): JSX.Element | null => {
  const { isActive } = useTutorial();
  const [needed, setNeeded] = useState(false);

  useEffect(() => {
    if (isActive) setNeeded(true);
  }, [isActive]);

  return needed || isActive ? <TutorialComponent /> : null;
};

export { LazyTutorialComponent };
