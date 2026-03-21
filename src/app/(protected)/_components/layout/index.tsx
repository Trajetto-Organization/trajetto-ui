"use client";

import { useProtectedLayout } from "./hooks";
import { useNavigationSecurityCheck } from "./hooks/navigation-security-check";

import { DriverLayout } from "./protected-driver-layout";
import { DefaultLayout } from "./protected-default-layout";

import { ProtectedLayoutLayoutProps } from "./layout.types";

const ProtectedLayout = ({
  children,
  userLogged,
  error,
  notificationError = false,
}: ProtectedLayoutLayoutProps): JSX.Element => {
  const isDriver = userLogged.role === "BUSINESS_USER" && !!userLogged.driverId;

  useProtectedLayout(userLogged, error, notificationError);
  useNavigationSecurityCheck();

  if (isDriver) {
    return <DriverLayout userLogged={userLogged}>{children}</DriverLayout>;
  }

  return <DefaultLayout userLogged={userLogged}>{children}</DefaultLayout>;
};

export { ProtectedLayout };
