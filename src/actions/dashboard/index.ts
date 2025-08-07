"use server";

// Calculate percentage change
const calculateChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};

// Main function to get all dashboard data - Simplified version with single request
const getDashboardData = async (token: string) => {
  try {
    const response = await fetch(
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
          ],
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch dashboard data");
    }

    const data = await response.json();

    // Calculate the change percentage for each entity count
    const calculateCountsWithChange = (counts: {
      currentMonth: number;
      lastMonth: number;
    }) => ({
      value: counts.currentMonth,
      change: calculateChange(counts.currentMonth, counts.lastMonth),
    });

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
      recentActivity: data.recentActivity,
      vehiclesByType: data.vehiclesByType.map((item: any, index: number) => ({
        name: item.name,
        value: item.count,
        color: ["#3b82f6", "#8b5cf6", "#ec4899", "#f97316"][index % 4],
      })),
      maintenanceCosts: data.maintenanceCosts,
    };
  } catch (error) {
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
