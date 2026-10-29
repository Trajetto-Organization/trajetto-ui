"use client";

import { useProtectedLayout } from "./hooks";
import { useNavigationSecurityCheck } from "./hooks/navigation-security-check";

import { DriverLayout } from "./protected-driver-layout";
import { DefaultLayout } from "./protected-default-layout";

import { ProtectedLayoutLayoutProps } from "./layout.types";

import { ForceLogoutOverlay } from "@/components/shared/force-logout-overlay";
import { ConnectionRetry } from "@/components/shared/connection-lost-screen/connection-retry";

const ProtectedLayout = ({
  children,
  userLogged,
}: ProtectedLayoutLayoutProps): JSX.Element => {
  const isDriver = userLogged.role === "BUSINESS_USER" && !!userLogged.driverId;

  useProtectedLayout(userLogged);
  useNavigationSecurityCheck();

  // Rendered alongside both layouts rather than inside them: a forced logout
  // can happen on any screen, and the driver and the default layout would
  // otherwise each need their own copy.
  return (
    <>
      {isDriver ? (
        <DriverLayout userLogged={userLogged}>{children}</DriverLayout>
      ) : (
        <DefaultLayout userLogged={userLogged}>{children}</DefaultLayout>
      )}

      <ForceLogoutOverlay />
      <ConnectionRetry />
    </>
  );
};

export { ProtectedLayout };
