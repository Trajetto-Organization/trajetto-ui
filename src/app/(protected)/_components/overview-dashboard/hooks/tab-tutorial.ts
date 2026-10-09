import { useTutorial } from "../../layout/protected-tutorial/tutorial-provider";

/**
 * The dashboard's tab, told to the tour provider by the Tabs themselves.
 *
 * The old hook watched `data-state` with a MutationObserver and only knew
 * two of the four tabs; the provider ran a second, page-wide observer on top.
 * `onValueChange` is the one event that says which tab is open.
 */
function useTabTutorial(): (tab: string) => void {
  const { setCurrentTab } = useTutorial();

  return setCurrentTab;
}

export { useTabTutorial };
