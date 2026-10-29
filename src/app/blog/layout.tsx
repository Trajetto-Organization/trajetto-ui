import { ReactNode } from "react";

import { SiteShell } from "@/components/site/site-shell";

type BlogLayoutProps = Readonly<{
  children: ReactNode;
}>;

const BlogLayout = ({ children }: BlogLayoutProps): JSX.Element => (
  <SiteShell>{children}</SiteShell>
);

export default BlogLayout;
