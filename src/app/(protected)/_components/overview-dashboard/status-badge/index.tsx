import { Badge } from "@/components/ui/badge";

import {
  activityStatusClass,
  activityStatusLabel,
} from "@/features/activity/lib/activity-catalog";

/**
 * The status of a recent activity row, as the activity table and timeline
 * show it: the trail's catalog is the one source (FLEET-ACT-2). This used to
 * be a fourth copy of the map, with nine statuses, so route and proof rows
 * ("Planejada", "Liberada", "Aprovado") read grey and "PLANNED" came out raw.
 */
const getStatusBadge = (status: string): JSX.Element => {
  return (
    <Badge variant="outline" className={activityStatusClass(status)}>
      {activityStatusLabel(status)}
    </Badge>
  );
};

export { getStatusBadge };
