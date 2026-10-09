"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useAuthStore } from "@/store/auth-store";

import { ChatLinkedMessages } from "@/features/deliveries/chat/linked-messages";
import {
  buildChatSearchParams,
  buildTicketSearchParams,
} from "@/features/deliveries/chat/lib/chat-link";
import { LinkedTickets } from "@/features/deliveries/chat/tickets/linked-tickets";

interface RouteConversationsProps {
  businessId: string;
  route: {
    id: string;
    code: number;
    driver: { id: string; name: string } | null;
  };
}

/**
 * The route's support tickets (decision 14.5, design §6.4) and what was said
 * about THIS route in the driver's thread (decision 6.7),
 * moved here from the old detail dialog, and the way into the chat filtered
 * the same way — in the area (/admin or /dashboard) the dispatcher is in,
 * keeping the MASTER's company. Writing stays in the chat.
 */
const RouteConversations = ({
  businessId,
  route,
}: RouteConversationsProps): JSX.Element | null => {
  const router = useRouter();
  const pathname = usePathname();
  const currentSearchParams = useSearchParams();

  // Only the MASTER names the company to the chat actions (the one picked on
  // /admin); everyone else is answered from the session.
  const role = useAuthStore((state) => state.role);
  const chatBusinessId = role === "MASTER" ? businessId : undefined;

  const driver = route.driver;

  if (!driver) return null;

  const area = pathname?.startsWith("/admin") ? "/admin" : "/dashboard";

  // "Ver conversa": the Atendimentos tab on that ticket, same area, same company.
  const openTicket = (ticketId: string) => {
    const params = buildTicketSearchParams(
      currentSearchParams?.toString() ?? "",
      ticketId,
    );

    router.push(`${area}/deliveries?${params.toString()}`);
  };

  const openChatOnRoute = () => {
    const params = buildChatSearchParams(
      currentSearchParams?.toString() ?? "",
      {
        driver,
        route: { id: route.id, code: route.code },
        filter: "route",
      },
    );

    router.push(`${area}/deliveries?${params.toString()}`);
  };

  return (
    <div
      className="space-y-4 rounded-lg border p-4"
      data-tutorial="route-conversations"
    >
      <LinkedTickets
        actionBusinessId={chatBusinessId}
        driver={{ id: driver.id, name: driver.name }}
        context={{ kind: "route", id: route.id }}
        onOpenTicket={openTicket}
      />

      <ChatLinkedMessages
        actionBusinessId={chatBusinessId}
        driver={{ id: driver.id, name: driver.name }}
        filter={{ kind: "route", id: route.id, label: `Rota ${route.code}` }}
        onOpenChat={openChatOnRoute}
      />
    </div>
  );
};

export { RouteConversations };
