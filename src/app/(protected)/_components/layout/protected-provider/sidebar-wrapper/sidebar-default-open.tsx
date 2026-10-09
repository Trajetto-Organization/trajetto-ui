"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * The sidebar's starting state, read from `sidebar:state` by the protected
 * layout on the server (lib/sidebar-state). A context rather than a prop: the
 * layout sits four client components above the SidebarProvider, and both the
 * default and the driver layout mount one.
 */
const SidebarDefaultOpenContext = createContext<boolean>(true);

function SidebarDefaultOpen({
  value,
  children,
}: {
  value: boolean;
  children: ReactNode;
}): JSX.Element {
  return (
    <SidebarDefaultOpenContext.Provider value={value}>
      {children}
    </SidebarDefaultOpenContext.Provider>
  );
}

/** Open unless the person left it collapsed; open with no layout above. */
function useSidebarDefaultOpen(): boolean {
  return useContext(SidebarDefaultOpenContext);
}

export { SidebarDefaultOpen, useSidebarDefaultOpen };
