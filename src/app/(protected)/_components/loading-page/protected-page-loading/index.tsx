import { Skeleton } from "@/components/ui/skeleton";
import {
  sidebarItems,
  type NavSurface,
} from "../../layout/protected-navbar-items";

interface ProtectedPageLoadingProps {
  /**
   * The sidebar state the person left (`sidebar:state`, read by the layout).
   * Collapsed, the real sidebar is the 3rem icon rail and the header shrinks
   * to h-12; drawing the full menu here made the page jump when it streamed.
   * Only from md up: below it the sidebar is a closed sheet, nothing is
   * collapsed, and the hydrated header is h-14.
   */
  sidebarOpen?: boolean;

  /**
   * Whose menu the sidebar is sized on. The driver's shell has had the same
   * sidebar as the office since decision 4.8, with its own shorter menu.
   */
  surface?: NavSurface;
}

const ProtectedPageLoading = ({
  sidebarOpen = true,
  surface = "dashboard",
}: ProtectedPageLoadingProps): JSX.Element => {
  const navItems = sidebarItems(surface);

  return (
    <div data-tutorial="loading" className="flex h-screen">
      {/* Sidebar Skeleton */}
      {sidebarOpen ? (
        <div
          className="w-64 border-r p-4 hidden md:flex flex-col"
          data-sidebar-skeleton="expanded"
        >
          <Skeleton className="h-8 w-32 mb-4" /> {/* Company Name */}
          {/* Simulating the quantity of menu items */}
          <div className="flex flex-col space-y-3 mt-3">
            <Skeleton className="h-6 w-16" />
            {navItems.map((item, index) => (
              <Skeleton key={index} className="h-6 w-full" />
            ))}
          </div>
          <div className="mt-auto">
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
      ) : (
        <div
          className="w-12 border-r py-4 hidden md:flex flex-col items-center"
          data-sidebar-skeleton="collapsed"
        >
          <Skeleton className="h-8 w-8 rounded-lg mb-4" /> {/* Company logo */}
          {/* One icon per menu item, as the rail shows them */}
          <div className="flex flex-col items-center space-y-3 mt-3">
            {navItems.map((item, index) => (
              <Skeleton key={index} className="h-8 w-8 rounded-md" />
            ))}
          </div>
          <div className="mt-auto">
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-col flex-1 w-full">
        {/* Header */}
        <div
          className={`${sidebarOpen ? "h-14" : "h-14 md:h-12"} border-b flex items-center px-4`}
        >
          <Skeleton className="h-8 w-8 rounded-md mr-4" /> {/* Menu icon */}
          <Skeleton className="h-6 w-48" /> {/* Breadcrumbs */}
        </div>
      </div>
    </div>
  );
};

export { ProtectedPageLoading };
