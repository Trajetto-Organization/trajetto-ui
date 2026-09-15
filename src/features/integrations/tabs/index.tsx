"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Activity, KeyRound, Webhook } from "lucide-react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { INTEGRATION_TABS, type IntegrationTab } from "../lib/tabs";

const TAB_ICONS = {
  "api-keys": KeyRound,
  webhooks: Webhook,
  monitor: Activity,
} as const;

interface IntegrationsTabsProps {
  activeTab: IntegrationTab;
}

/**
 * The tab lives in the URL, like every other multi-panel screen here: a link
 * somebody pastes into a support thread has to reopen what they were looking
 * at, and "the webhook monitor" is exactly the thing people paste.
 */
const IntegrationsTabs = ({ activeTab }: IntegrationsTabsProps): JSX.Element => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChangeTab = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    params.set("tab", value);

    // Paging belongs to the panel being left behind.
    params.delete("page");

    router.push(`?${params.toString()}`);
  };

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleChangeTab}
      className="w-full lg:w-auto"
    >
      <TabsList
        className="w-full max-w-full justify-start
        overflow-x-auto lg:w-auto"
      >
        {INTEGRATION_TABS.map((tab) => {
          const Icon = TAB_ICONS[tab.value];

          return (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex flex-1 items-center space-x-1
              px-2 sm:px-3 lg:flex-initial"
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
};

export { IntegrationsTabs };
