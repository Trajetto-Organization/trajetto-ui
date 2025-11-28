"use client";

import { useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";

import { SafeSidebarProviderProps } from "../../dto";

const SidebarWrapper = ({
  children,
}: SafeSidebarProviderProps): JSX.Element => {
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
