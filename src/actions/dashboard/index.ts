// Not "use server": only Server Components call this, and each exported
// function of a "use server" module is an endpoint any browser can call with
// any arguments (here, any token), proxied through this server.
// server-only: a client import would fail the build instead of shipping it.
import "server-only";

import { logActionError } from "@/lib/log-action-error";
import { apiFetch } from "@/lib/api-fetch";
import { countCard } from "@/lib/dashboard-counts";

// Main function to get all dashboard data - Simplified version with single request
const getDashboardData = async (token: string) => {
  try {
    const response = await apiFetch(
      `${process.env.HTTP_REQUEST}/dashboard/overview`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip",
          Authorization: `Bearer ${token}`,
        },
        next: {
          tags: [
            "update-entity-count",
            "update-vehicle-status",
            "update-maintenance-stats",
            "update-recent-activity",
            "update-vehicle-by-type",
            "update-maintenance-costs",
            "update-vehicle-count",
            "update-driver-count",
            "update-business-count",
            "update-branch-count",
            "update-part-count",
            "update-supplier-count",
            "update-service-order-count",
            "update-user-count",
            "update-fine-count",
            "update-delivery-count",
            "update-route-count",
          ],
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch dashboard data");
    }

    const data = await response.json();

    // What each card shows and its comparison (lib/dashboard-counts).
    const calculateCountsWithChange = countCard;

    // Transform the data to match the expected format
    return {
      counts: {
        vehicles: calculateCountsWithChange(data.counts.vehicles),
        drivers: calculateCountsWithChange(data.counts.drivers),
        businesses: calculateCountsWithChange(data.counts.businesses),
        branches: calculateCountsWithChange(data.counts.branches),
        parts: calculateCountsWithChange(data.counts.parts),
        suppliers: calculateCountsWithChange(data.counts.suppliers),
        serviceOrders: calculateCountsWithChange(data.counts.serviceOrders),
        users: calculateCountsWithChange(data.counts.users),
        fines: calculateCountsWithChange(data.counts.fines),

        // Absent rather than zero when the company did not hire the module
        // or the profile may not read them — the API leaves the keys out,
        // and a zeroed card would claim an operation that stands still.
        deliveries: data.counts.deliveries
          ? calculateCountsWithChange(data.counts.deliveries)
          : undefined,
        routes: data.counts.routes
          ? calculateCountsWithChange(data.counts.routes)
          : undefined,
      },
      vehicleStatus: [
        {
          status: "ACTIVE",
          label: "Ativo",
          count: data.vehicleStatus.ACTIVE || 0,
          color: "#22c55e",
        },
        {
          status: "INACTIVE",
          label: "Inativo",
          count: data.vehicleStatus.INACTIVE || 0,
          color: "#f97316",
        },
        {
          status: "BLOCKED",
          label: "Bloqueado",
          count: data.vehicleStatus.BLOCKED || 0,
          color: "#ef4444",
        },
        {
          status: "IN_ROUTE",
          label: "Em rota",
          count: data.vehicleStatus.IN_ROUTE || 0,
          color: "#3b82f6",
        },
      ],
      activityTrends: data.activityTrends,
      maintenanceStats: [
        {
          name: "Manutenção Pendente",
          value: data.maintenanceStats.pending || 0,
          color: "#f97316",
          // Inside `pending`: the ones with no revision recorded. Absent
          // from an older API; the card then says nothing about them.
          unrecorded:
            typeof data.maintenanceStats.unrecorded === "number"
              ? data.maintenanceStats.unrecorded
              : undefined,
        },
        {
          name: "Recém Manutenido",
          value: data.maintenanceStats.recent || 0,
          color: "#22c55e",
        },
        {
          name: "Atrasado",
          value: data.maintenanceStats.overdue || 0,
          color: "#ef4444",
        },
      ],
      /**
       * What the operation is doing right now.
       *
       * Null on purpose in three cases the API distinguishes — a MASTER with
       * no single company, a company without the deliveries module, and a
       * profile that may not read deliveries — and the panel simply does not
       * draw the block. Zeroes would read as a quiet day.
       */
      deliveryOperation: data.deliveryOperation ?? null,
      recentActivity: data.recentActivity,
      vehiclesByType: data.vehiclesByType.map((item: any, index: number) => ({
        name: item.name,
        value: item.count,
        color: ["#3b82f6", "#8b5cf6", "#ec4899", "#f97316"][index % 4],
      })),
      maintenanceCosts: data.maintenanceCosts,
    };
  } catch (error) {
    logActionError("dashboard", error);
    // Return empty data structure on error
    return {
      counts: {
        vehicles: { value: 0, change: 0 },
        drivers: { value: 0, change: 0 },
        businesses: { value: 0, change: 0 },
        branches: { value: 0, change: 0 },
        parts: { value: 0, change: 0 },
        suppliers: { value: 0, change: 0 },
        serviceOrders: { value: 0, change: 0 },
        users: { value: 0, change: 0 },
        fines: { value: 0, change: 0 },
      },
      deliveryOperation: null,
      vehicleStatus: [],
      activityTrends: [],
      maintenanceStats: [],
      recentActivity: [],
      vehiclesByType: [],
      maintenanceCosts: [],
    };
  }
};

export { getDashboardData };
