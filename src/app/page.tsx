import { Navbar } from "@/components/layouts/navbar";

import { Features } from "@/components/home/features";
import { Hero } from "@/components/home/hero";

import { AIVerificationShowcase } from "@/components/home/ai-verification";
import { AIUsageLimits } from "@/components/home/ai-usage-limits";

import { ActivityMonitoring } from "@/components/home/activity-monitoring";
import { KanbanShowcase } from "@/components/home/kanban-showcase";

import { TutorialShowcase } from "@/components/home/tutorial-showcase";
import { DataExportShowcase } from "@/components/home/data-export";

import { FleetManagementDashboard } from "@/components/home/fleet-management-dashboard";
import { InteractiveDemo } from "@/components/home/interactive-demo";

import { AppShowcase } from "@/components/home/app-show-case";
import { Stats } from "@/components/home/stats";

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
      <AIUsageLimits />
      <ActivityMonitoring />
      <KanbanShowcase />
      <TutorialShowcase />
      <DataExportShowcase />
      <FleetManagementDashboard />
      <InteractiveDemo />
      {/* <Reviews /> */}
      <AppShowcase />
      <Banner />
      <Footer />
      {/* <WhatsApp /> */}
    </>
  );
};

export default Home;
