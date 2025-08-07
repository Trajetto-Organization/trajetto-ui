import { useEffect } from "react";
import { useTutorial } from "../../tutorial/tutorial-provider";

export function useTabTutorial() {
  const { setCurrentTab } = useTutorial();

  useEffect(() => {
    // Function to detect active tab changes
    const detectActiveTab = () => {
      // Look for active tab trigger based on data-state="active"
      const activeTabTrigger = document.querySelector(
        '[data-state="active"][data-tutorial*="tab"]',
      );
      if (activeTabTrigger) {
        const tutorialAttr = activeTabTrigger.getAttribute("data-tutorial");
        if (tutorialAttr?.includes("overview")) {
          setCurrentTab("overview");
        } else if (tutorialAttr?.includes("charts")) {
          setCurrentTab("charts");
        }
      }
    };

    // Initial detection with a small delay to ensure DOM is ready
    const initialTimer = setTimeout(detectActiveTab, 100);

    // Create observer for tab changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "data-state" &&
          mutation.target instanceof Element &&
          mutation.target.hasAttribute("data-tutorial")
        ) {
          // Small delay to ensure state is fully updated
          setTimeout(detectActiveTab, 50);
        }
      });
    });

    // Start observing the tabs container
    const tabsList = document.querySelector('[data-tutorial="dashboard-tabs"]');
    if (tabsList) {
      observer.observe(tabsList, {
        attributes: true,
        subtree: true,
        attributeFilter: ["data-state"],
      });
    }

    return () => {
      clearTimeout(initialTimer);
      observer.disconnect();
    };
  }, [setCurrentTab]);
}
