import { useEffect, useState } from "react";
import { toast } from "sonner";

import { RevalidateDataState } from "./dto";
import { queryClientProps } from "@/lib/query-client-props";

import {
  revalidateDataToQueryKeyMap,
  RevalidateDataProps,
} from "@/lib/query-keys-mapping";

type RateLimitConfig = {
  maxClicks?: number; // Maximum number of clicks allowed
  timeWindowMs?: number; // Time window in ms to count clicks
  cooldownTimeMs?: number; // Waiting time when limit is exceeded
  storageKey?: string; // Custom key for localStorage
};

const getStorageKey = (key?: string) => key || "revalidate-rate-limit";
const loadStorageData = (storageKey?: string) => {
  if (typeof window === "undefined") {
    return {
      clicks: [] as number[],
      isLimited: false,
      cooldownEndTime: 0,
    };
  }

  const key = getStorageKey(storageKey);
  const storedData = localStorage.getItem(key);

  if (storedData) {
    return JSON.parse(storedData);
  }

  return {
    clicks: [] as number[],
    isLimited: false,
    cooldownEndTime: 0,
  };
};

const saveStorageData = (data: any, storageKey?: string) => {
  if (typeof window === "undefined") {
    return;
  }

  const key = getStorageKey(storageKey);
  localStorage.setItem(key, JSON.stringify(data));
};

export function useDataTableRevalidate(
  state: RevalidateDataState | null | undefined,
  config: RateLimitConfig = {
    maxClicks: 3, // 3 clicks
    timeWindowMs: 30000, // in 30 seconds
    cooldownTimeMs: 15000, // 15 second cooldown
  },
  revalidateDataKey?: RevalidateDataProps,
) {
  // Initial states without accessing localStorage, avoiding hydration error
  const [isClient, setIsClient] = useState(false);
  const [clickData, setClickData] = useState({
    clicks: [] as number[],
    isLimited: false,
    cooldownEndTime: 0,
  });

  const [isRateLimited, setIsRateLimited] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  useEffect(() => {
    setIsClient(true);

    const storedData = loadStorageData(config.storageKey);

    // Check if the cooldown time has passed
    const now = Date.now();
    if (storedData.isLimited && storedData.cooldownEndTime <= now) {
      // If the cooldown is already over, we reset the state
      const resetData = {
        ...storedData,
        isLimited: false,
        cooldownEndTime: 0,
      };

      // Updates local data and in localStorage
      setClickData(resetData);
      saveStorageData(resetData, config.storageKey);

      setIsRateLimited(false);
      setCooldownRemaining(0);
    } else {
      setClickData(storedData);
      setIsRateLimited(storedData.isLimited);

      // If it is on cooldown, we calculate the remaining time
      if (storedData.isLimited) {
        const remainingTime = Math.max(
          1,
          Math.ceil((storedData.cooldownEndTime - now) / 1000),
        );

        setCooldownRemaining(remainingTime);
      }
    }
  }, [config.storageKey]);

  useEffect(() => {
    if (state?.revalidateDataError) {
      toast.error(state?.revalidateDataError);
      return;
    }

    if (state && !state.revalidateDataError && revalidateDataKey) {
      const queryKeys = revalidateDataToQueryKeyMap[revalidateDataKey];

      if (queryKeys && queryKeys.length > 0) {
        // Invalidate all matching queries
        Promise.all(
          queryKeys.map((queryKey) =>
            queryClientProps.invalidateQueries([queryKey]),
          ),
        );
      }
    }
  }, [state, revalidateDataKey]);

  // Check the current rate limiting state when mounting the component
  useEffect(() => {
    if (!isClient) return;
    const now = Date.now();

    // If it is on cooldown, the counter continues
    if (clickData.isLimited && clickData.cooldownEndTime > now) {
      setIsRateLimited(true);

      const remainingTime = Math.ceil((clickData.cooldownEndTime - now) / 1000);

      setCooldownRemaining(remainingTime);

      // Sets the interval to update the counter
      const intervalId = setInterval(() => {
        const currentTime = Date.now();
        if (currentTime >= clickData.cooldownEndTime) {
          clearInterval(intervalId);

          const updatedData = {
            ...clickData,
            isLimited: false,
            cooldownEndTime: 0,
          };

          setClickData(updatedData);

          // Save to localStorage
          saveStorageData(updatedData, config.storageKey);
          setIsRateLimited(false);

          setCooldownRemaining(0);
        } else {
          // We never let the counter reach zero while it is limited
          // Minimum of 1 second until completely released
          const remaining = Math.max(
            1,
            Math.ceil((clickData.cooldownEndTime - currentTime) / 1000),
          );
          setCooldownRemaining(remaining);
        }
      }, 1000);

      return () => clearInterval(intervalId);
    }

    // Clear old clicks outside the time window
    const validClicks = clickData.clicks.filter(
      (timestamp: number) => now - timestamp < (config.timeWindowMs as number),
    );

    if (validClicks.length !== clickData.clicks.length) {
      const updatedData = {
        ...clickData,
        clicks: validClicks,
      };
      setClickData(updatedData);
      // Saves updated clicks to localStorage
      saveStorageData(updatedData, config.storageKey);
    }

    return () => {};
  }, [isClient, clickData, config.timeWindowMs, config.storageKey]);

  // Function to register a click and check the rate limit
  const registerClick = () => {
    // If we are not on the client, we allow the click
    if (!isClient) return true;
    const now = Date.now();

    // If it is already limited, it does nothing.
    if (clickData.isLimited) {
      return false;
    }

    // Creates a copy of the current clicks and adds the new one
    const newClicks = [...clickData.clicks, now];

    // Remove clicks outside the time window
    const validClicks = newClicks.filter(
      (timestamp: number) => now - timestamp < (config.timeWindowMs as number),
    );

    // Check if the limit has been exceeded
    if (validClicks.length > (config.maxClicks as number)) {
      // Activates cooldown
      const updatedData = {
        clicks: validClicks,
        isLimited: true,
        cooldownEndTime: now + (config.cooldownTimeMs as number),
      };

      setClickData(updatedData);

      // Save to localStorage
      saveStorageData(updatedData, config.storageKey);

      setIsRateLimited(true);
      setCooldownRemaining(Math.ceil((config.cooldownTimeMs as number) / 1000));

      // Notifies the user
      toast.warning(
        `Muitas solicitações! Aguarde ${Math.ceil((config.cooldownTimeMs as number) / 1000)} segundos.`,
      );

      // Start the countdown timer
      const intervalId = setInterval(() => {
        const currentTime = Date.now();

        if (currentTime >= updatedData.cooldownEndTime) {
          clearInterval(intervalId);

          const resetData = {
            ...updatedData,
            isLimited: false,
            cooldownEndTime: 0,
          };

          setClickData(resetData);
          saveStorageData(resetData, config.storageKey);

          setIsRateLimited(false);
          setCooldownRemaining(0);
        } else {
          // We never let the counter reach zero while it is limited
          const remaining = Math.max(
            1,
            Math.ceil((updatedData.cooldownEndTime - currentTime) / 1000),
          );

          setCooldownRemaining(remaining);
        }
      }, 1000);

      return false;
    } else {
      // If you haven't exceeded the limit, just update the clicks
      const updatedData = {
        ...clickData,
        clicks: validClicks,
      };

      setClickData(updatedData);

      // Save to localStorage
      saveStorageData(updatedData, config.storageKey);
      return true;
    }
  };

  return {
    isRateLimited,
    cooldownRemaining,
    registerClick,
  };
}
