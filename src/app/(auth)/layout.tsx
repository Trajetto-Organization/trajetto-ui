import { AuthLayout } from "@/components/layouts/auth-layout";

type RootAuthLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

const RootAuthLayout = ({ children }: RootAuthLayoutProps): JSX.Element => {
  return <AuthLayout>{children}</AuthLayout>;
};

export default RootAuthLayout;
