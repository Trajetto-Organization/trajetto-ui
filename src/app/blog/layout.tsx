import { ReactNode } from "react";
import { Metadata } from "next";

import { Navbar } from "@/components/layouts/navbar";
import { Footer } from "@/components/layouts/footer";

import { WhatsApp } from "@/components/home/whatsapp";

type BlogLayoutProps = Readonly<{
  children: ReactNode;
}>;

export const metadata: Metadata = {
  robots: {
    follow: true,
    index: true,
  },
};

const BlogLayout = async ({ children }: BlogLayoutProps) => {
  return (
    <>
      <Navbar />
      <div
        className="w-full max-w-[1400px] 
        mx-auto px-4 py-14 min-h-screen"
      >
        {children}
      </div>
      <Footer />
      <WhatsApp />
    </>
  );
};

export default BlogLayout;
