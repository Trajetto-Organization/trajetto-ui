"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { LayoutList, Table2 } from "lucide-react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ActivityView = "timeline" | "table";

interface ActivityViewSwitchProps {
  activeView: ActivityView;
}

/**
 * The view lives in the URL: a shared link has to reopen the same reading,
 * and the server needs to know which one to render.
 */
const ActivityViewSwitch = ({
  activeView,
}: ActivityViewSwitchProps): JSX.Element => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChangeView = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    params.set("view", value);
    params.delete("page");

    router.push(`?${params.toString()}`);
  };

  return (
    <Tabs
      value={activeView}
      onValueChange={handleChangeView}
      className="w-full sm:w-auto"
    >
      <TabsList className="w-full sm:w-auto">
        <TabsTrigger
          value="timeline"
          className="flex flex-1 items-center space-x-1 px-3 sm:flex-initial"
        >
          <LayoutList className="h-4 w-4" />
          <span>Linha do tempo</span>
        </TabsTrigger>
        <TabsTrigger
          value="table"
          className="flex flex-1 items-center space-x-1 px-3 sm:flex-initial"
        >
          <Table2 className="h-4 w-4" />
          <span>Tabela</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};

export { ActivityViewSwitch };
export type { ActivityView };
