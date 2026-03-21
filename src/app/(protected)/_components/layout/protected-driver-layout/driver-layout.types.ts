import { ReactNode } from "react";
import { UserLogged } from "../shared/common.types";

interface DriverLayoutProps {
  children: ReactNode;
  userLogged: UserLogged;
}

export type { DriverLayoutProps };
