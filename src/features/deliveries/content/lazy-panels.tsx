"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * The client panels of Entregas, one chunk each.
 *
 * The page module rendered all four from static imports, so every tab —
 * the table most people open — downloaded and parsed the chat (~30 KB
 * gzipped), the proof audit queue, the message templates and the monitoring
 * boards. Each is now fetched when its tab renders. The server still renders
 * the open tab's panel (ssr stays on), so a full load paints it at once; the
 * placeholder below only shows during a client-side tab change, until the
 * chunk arrives.
 */
const PanelLoading = (): JSX.Element => (
  <div data-tutorial="loading" aria-busy="true" className="space-y-4">
    <Skeleton className="h-10 w-full" />
    <Skeleton className="h-[60vh] w-full rounded-lg" />
  </div>
);

const ChatPanel = dynamic(
  () => import("../chat").then((module) => module.ChatPanel),
  {
    loading: PanelLoading,
  },
);

const ProofAuditsPanel = dynamic(
  () =>
    import("../proof-audits/panel").then((module) => module.ProofAuditsPanel),
  { loading: PanelLoading },
);

const MessageTemplatesPanel = dynamic(
  () =>
    import("../message-templates/panel").then(
      (module) => module.MessageTemplatesPanel,
    ),
  { loading: PanelLoading },
);

const MonitoringPanel = dynamic(
  () => import("../monitoring").then((module) => module.MonitoringPanel),
  { loading: PanelLoading },
);

export { ChatPanel, MessageTemplatesPanel, MonitoringPanel, ProofAuditsPanel };
