import { AuthLayout } from "@/components/layouts/auth-layout";

// Rendered per request so the pages that take a password carry the strict,
// nonce-based CSP (src/lib/content-security-policy.ts): a prerendered page
// could only get the 'unsafe-inline' variant.
export const dynamic = "force-dynamic";

type RootAuthLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

const RootAuthLayout = ({ children }: RootAuthLayoutProps): JSX.Element => {
  return <AuthLayout>{children}</AuthLayout>;
};

export default RootAuthLayout;
