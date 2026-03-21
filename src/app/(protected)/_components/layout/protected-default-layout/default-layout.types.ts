import { ReactNode } from "react";
import { UserLogged } from "../shared/common.types";

interface DefaultLayoutProps {
  children: ReactNode;
  userLogged: UserLogged;
}

export type { DefaultLayoutProps };
