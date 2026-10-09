"use client";

import { ReactNode, useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";

import { useSidebarDefaultOpen } from "./sidebar-default-open";

interface SafeSidebarProviderProps {
  children: ReactNode;
}

const SidebarWrapper = ({
  children,
}: SafeSidebarProviderProps): JSX.Element => {
  // The collapsed/open choice the person left, read from the cookie on the
  // server, so a reload does not reopen a collapsed menu.
  const defaultOpen = useSidebarDefaultOpen();

  useEffect(() => {
    // 🔧 Patch to prevent react-remove-scroll error
    const originalContains = Node.prototype.contains;
    Node.prototype.contains = function (other) {
      try {
        // Check if both nodes are valid
        if (!this || !other || !other.nodeType) {
          return false;
        }

        return originalContains.call(this, other);
      } catch (error) {
        return false;
      }
    };

    // Cleanup: restore original method
    return () => {
      Node.prototype.contains = originalContains;
    };
  }, []);

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      style={
        {
          "--sidebar-width": "16rem",
          "--sidebar-width-mobile": "20rem",
        } as React.CSSProperties
      }
    >
      {children}
    </SidebarProvider>
  );
};

export { SidebarWrapper };
