"use client";

import { useSearchParams } from "next/navigation";
import { Activity, ArrowDownUp, KeyRound, Webhook } from "lucide-react";

import { SegmentedNav } from "@/components/ui/segmented-nav";

import { INTEGRATION_TABS, type IntegrationTab } from "../lib/tabs";

const TAB_ICONS = {
  "api-keys": KeyRound,
  webhooks: Webhook,
  monitor: Activity,
  usage: ArrowDownUp,
} as const;

interface IntegrationsTabsProps {
  activeTab: IntegrationTab;
}

/**
 * The tab lives in the URL, like every other multi-panel screen here: a link
 * somebody pastes into a support thread has to reopen what they were looking
 * at, and "the webhook monitor" is exactly the thing people paste.
 */
const IntegrationsTabs = ({
  activeTab,
}: IntegrationsTabsProps): JSX.Element => {
  const searchParams = useSearchParams();

  const hrefFor = (value: string): string => {
    const params = new URLSearchParams(searchParams.toString());

    params.set("tab", value);

    // Paging belongs to the panel being left behind.
    params.delete("page");

    return `?${params.toString()}`;
  };

  return (
    <SegmentedNav
      label="Seções de integrações"
      activeValue={activeTab}
      hrefFor={hrefFor}
      /*
        Four short sections, so the rail keeps its own width instead of
        spanning the page. Entregas (six) and the Torre (five views) fill;
        stretching these four to match put 390px under each label on a wide
        screen. Same control, different number of things in it.
      */
      fill={false}
      dataTutorial="integrations-tabs"
      items={INTEGRATION_TABS.map((tab) => ({
        value: tab.value,
        label: tab.label,
        icon: TAB_ICONS[tab.value],
      }))}
    />
  );
};

export { IntegrationsTabs };
