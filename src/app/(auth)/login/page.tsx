import { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";
import { buildPageMetadata } from "@/lib/page-metadata";

// Indexable and in the sitemap, so a search for "Trajetto login" lands here.
// Its own canonical; it used to point at the home.
export const metadata: Metadata = buildPageMetadata({
  path: "/login",
  title: "Entrar",
  socialTitle: "Entrar no Trajetto",
  description:
    "Entre na sua conta do Trajetto para acessar a gestão de frotas e de entregas da sua empresa.",
});

const Login = (): JSX.Element => {
  return <LoginForm />;
};

export default Login;
