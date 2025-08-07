import { Skeleton } from "@/components/ui/skeleton";
import { protectedNavItemsByRole } from "../../layout/protected-navbar-items";

const ProtectedPageLoading = (): JSX.Element => {
  return (
    <div className="flex h-screen">
      {/* Sidebar Skeleton */}
      <div className="w-64 border-r p-4 hidden md:flex flex-col">
        <Skeleton className="h-8 w-32 mb-4" /> {/* Company Name */}
        {/* Simulating the real quantity of menu items */}
        <div className="flex flex-col space-y-3 mt-3">
          <Skeleton className="h-6 w-16" />
          {protectedNavItemsByRole.MASTER.map((item, index) => (
            <Skeleton key={index} className="h-6 w-full" />
          ))}
        </div>
        <div className="mt-auto">
          <Skeleton className="h-8 w-full" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 w-full">
        {/* Header */}
        <div className="h-14 border-b flex items-center px-4">
          <Skeleton className="h-8 w-8 rounded-md mr-4" /> {/* Menu icon */}
          <Skeleton className="h-6 w-48" /> {/* Breadcrumbs */}
        </div>
      </div>
    </div>
  );
};

export { ProtectedPageLoading };
