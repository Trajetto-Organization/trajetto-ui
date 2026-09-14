"use client";

import { useMemo } from "react";
import { FilePlus2, FileX2, PencilLine } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { displayValue } from "@/lib/format-values";

import { ACTIVITY_STATUS_CLASSES, groupActivitiesByDay } from "../lib/grouping";
import type { ActivityRow } from "../lib/grouping";

interface ActivityTimelineProps {
  activities: ActivityRow[];
  /** Master sees which company each action belongs to. */
  showBusiness: boolean;
  responseError: { error: boolean; errorMessage: string };
}

const ACTION_META: Record<
  string,
  { label: string; icon: typeof FilePlus2; className: string }
> = {
  create: {
    label: "Criou",
    icon: FilePlus2,
    className: "bg-green-100 text-green-700 border-green-200",
  },
  update: {
    label: "Atualizou",
    icon: PencilLine,
    className: "bg-yellow-100 text-yellow-700 border-yellow-200",
  },
  delete: {
    label: "Excluiu",
    icon: FileX2,
    className: "bg-red-100 text-red-700 border-red-200",
  },
};

const ActivityTimeline = ({
  activities,
  showBusiness,
  responseError,
}: ActivityTimelineProps): JSX.Element => {
  const groups = useMemo(
    () => groupActivitiesByDay(activities),
    [activities],
  );

  if (responseError.error) {
    return (
      <div className="rounded-md border border-dashed py-16 text-center">
        <p className="text-sm text-muted-foreground">
          {responseError.errorMessage}
        </p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="rounded-md border border-dashed py-16 text-center">
        <p className="text-sm text-muted-foreground">
          Nenhuma atividade encontrada para os filtros atuais.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.key} className="space-y-3">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold">{group.label}</h3>
            <span className="text-xs text-muted-foreground">
              {group.items.length} ação(ões)
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <ol className="space-y-3">
            {group.items.map((activity) => {
              const action =
                ACTION_META[activity.action] ?? ACTION_META["update"];

              const Icon = action.icon;

              const businessName =
                activity.business?.corporate_reason ?? activity.tenantName;

              return (
                <li
                  key={activity.id}
                  className="flex gap-3 rounded-lg border p-3
                  transition-colors hover:bg-muted/40"
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center
                    justify-center rounded-full border ${action.className}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">
                        {displayValue(activity.user?.name)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {action.label.toLowerCase()}
                      </span>
                      <Badge variant="outline" className="text-[11px]">
                        {displayValue(activity.type)}
                      </Badge>

                      {activity.status && (
                        <Badge
                          variant="outline"
                          className={
                            ACTIVITY_STATUS_CLASSES[activity.status] ??
                            "bg-gray-100 text-gray-800 border-gray-200"
                          }
                        >
                          {activity.status}
                        </Badge>
                      )}
                    </div>

                    <p className="break-words text-sm text-muted-foreground">
                      {displayValue(activity.description)}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {group.formatTime(activity.created_at)}
                      {showBusiness && businessName
                        ? ` · ${businessName}`
                        : ""}
                      {activity.user?.email ? ` · ${activity.user.email}` : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
};

export { ActivityTimeline };
