import { Navbar } from "@/components/layouts/navbar";

import { Features } from "@/components/home/features";
import { Hero } from "@/components/home/hero";

import { AIVerificationShowcase } from "@/components/home/ai-verification";
import { Stats } from "@/components/home/stats";

import { FleetManagementDashboard } from "@/components/home/fleet-management-dashboard";
import { InteractiveDemo } from "@/components/home/interactive-demo";

import { Reviews } from "@/components/home/reviews";
import { AppShowcase } from "@/components/home/app-show-case";

import { WhatsApp } from "@/components/home/whatsapp";

import { Banner } from "@/components/home/banner";
import { Footer } from "@/components/layouts/footer";

const Home = (): JSX.Element => {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <Hero />
        <Features />
      </main>
      <Stats />
      <AIVerificationShowcase />
      <FleetManagementDashboard />
      <InteractiveDemo />
      <Reviews />
      <AppShowcase />
      <Banner />
      <Footer />
      <WhatsApp />
    </>
  );
};

export default Home;
