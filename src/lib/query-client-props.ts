import { QueryClient } from "react-query";

const queryClientProps = new QueryClient({
  defaultOptions: {
    queries: {
      // ⚡ Cache Strategy - Optimized for performance
      staleTime: 1000 * 60 * 5, // 5min - data considered fresh
      cacheTime: 1000 * 60 * 30, // 30min - data is cached

      // 🔄 Refetch Strategy - Smart control
      refetchOnWindowFocus: false, // Avoid unnecessary refetch
      refetchOnMount: true, // Ensures current data when assembling
      refetchOnReconnect: true, // Refetch when reconnecting network

      // 🛡️ Error Handling - Robust and smart
      retry: (failureCount, error: any) => {
        // Do not retry 4xx errors (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }

        // Maximum 3 attempts for network/server errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // 🎯 UX Optimization
      keepPreviousData: true, // Smooth transitions without flickering
      useErrorBoundary: false, // Handle errors locally
    },

    mutations: {
      // 🚀 Mutation Strategy
      retry: false, // Mutations do not automatically retry
      useErrorBoundary: false, // Handle mutation errors locally

      // 📊 Global Mutation Callbacks (optional - remove if not used)
      onError: (error: any) => {
        // Log in development only
        if (process.env.NODE_ENV === "development") {
          console.error("Mutation error:", error);
        }
      },
      onSuccess: (data: any) => {
        // Log in development only
        if (process.env.NODE_ENV === "development") {
          console.log("Mutation success:", data);
        }
      },
    },
  },
});

export { queryClientProps };
