"use client";

import { useProtectedLayout } from "./hooks";
import { useNavigationSecurityCheck } from "./hooks/use-navigation-security-check";

import { DriverLayout } from "./driver-layout";
import { DefaultLayout } from "./default-layout";

import { ProtectedLayoutLayoutProps } from "./dto";

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
