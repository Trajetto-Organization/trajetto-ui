import { useCallback, useEffect, useRef, useState } from "react";

import type { NominatimSearchResult } from "../location-picker.types";

/** The cmdk value of a result's item; the list renders it with this value. */
function resultItemValue(result: NominatimSearchResult): string {
  return `${result.place_id}-${result.display_name}`;
}

/**
 * Which result the list highlights (and so what Enter picks).
 *
 * cmdk highlights the first item on its own. That is right for a real match
 * and wrong for a weak one (see isWeakMatch): the highlight waits until the
 * person moves through the list with the arrow keys or the pointer.
 *
 * Controlled because cmdk's own pick cannot be vetoed otherwise. When it
 * picks while held, its internal value is already set and no state change
 * would follow (ours is still ""), so the value flips between "" and " "
 * (cmdk trims both to nothing) to push the empty highlight back into it.
 */
function useResultHighlight(results: NominatimSearchResult[], weak: boolean) {
  const [value, setValue] = useState("");
  const held = useRef(false);

  const clear = useCallback(
    () => setValue((current) => (current === "" ? " " : "")),
    [],
  );

  // Keyed by content: the search hands a new empty array on every render.
  const first = results[0] ? resultItemValue(results[0]) : "";
  const listKey = results.map((result) => result.place_id).join(",");

  useEffect(() => {
    held.current = weak;

    if (!first) setValue("");
    else if (weak) clear();
    else setValue(first);
  }, [listKey, first, weak, clear]);

  const onValueChange = useCallback(
    (next: string) => {
      if (held.current) clear();
      else setValue(next);
    },
    [clear],
  );

  /** Moving through the list (arrows, Home/End, pointer) is a choice: stop holding. */
  const release = useCallback(() => {
    held.current = false;
  }, []);

  const onKeyDownCapture = useCallback(
    (event: { key: string }) => {
      if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key))
        release();
    },
    [release],
  );

  return {
    value,
    onValueChange,
    onKeyDownCapture,
    onPointerMoveCapture: release,
  };
}

export { resultItemValue, useResultHighlight };
