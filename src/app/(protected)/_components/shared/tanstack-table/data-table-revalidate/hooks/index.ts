import { useEffect, useState } from "react";
import { toast } from "sonner";

import type { RateLimitConfig } from "../data-table-revalidate.types";

/** Three presses in thirty seconds, then fifteen seconds of countdown. */
const DEFAULT_RATE_LIMIT = {
  maxClicks: 3,
  timeWindowMs: 30000,
  cooldownTimeMs: 15000,
} as const;

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

/**
 * The rate limit every refresh button of the product shares (tables, the
 * overview, Kanban, the client panels' "Atualizar").
 *
 * It does not refresh anything itself: the click handler of each button
 * does (see useRevalidateScreen). Refreshing from an effect keyed on the
 * page's tag list re-ran on every render of pages that pass a literal array.
 */
export function useRefreshRateLimit(rateLimit: RateLimitConfig = {}) {
  // Merged with the defaults, so a caller can pass only what it changes: a
  // partial config replacing them would leave `maxClicks` undefined, and
  // `n > undefined` never limits.
  const config = {
    maxClicks: rateLimit.maxClicks ?? DEFAULT_RATE_LIMIT.maxClicks,
    timeWindowMs: rateLimit.timeWindowMs ?? DEFAULT_RATE_LIMIT.timeWindowMs,
    cooldownTimeMs:
      rateLimit.cooldownTimeMs ?? DEFAULT_RATE_LIMIT.cooldownTimeMs,
    storageKey: rateLimit.storageKey,
  };

  // Initial states without accessing localStorage, avoiding hydration error
  const [isClient, setIsClient] = useState<boolean>(false);
  const [clickData, setClickData] = useState({
    clicks: [] as number[],
    isLimited: false,
    cooldownEndTime: 0,
  });

  const [isRateLimited, setIsRateLimited] = useState<boolean>(false);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

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

    // Not limited any more: either the cooldown elapsed or this is a key we
    // have never been limited under. Both halves have to come down together —
    // the flag AND the data behind it. Leaving `clickData.isLimited` set with
    // an elapsed cooldown would re-enable the button while `registerClick`
    // still refused every click, since it returns early on that same flag.
    const cooldownElapsed = clickData.isLimited;

    // Clear old clicks outside the time window
    const validClicks = clickData.clicks.filter(
      (timestamp: number) => now - timestamp < config.timeWindowMs,
    );

    if (cooldownElapsed || validClicks.length !== clickData.clicks.length) {
      const updatedData = {
        ...clickData,
        clicks: validClicks,
        isLimited: false,
        cooldownEndTime: 0,
      };
      setClickData(updatedData);
      // Saves updated clicks to localStorage
      saveStorageData(updatedData, config.storageKey);
    }

    // Without this there is no path back to false other than the interval
    // above, so a clickData that arrives already unlimited — exactly what
    // switching tabs produces — used to leave the button stuck on "Aguarde".
    setIsRateLimited(false);
    setCooldownRemaining(0);

    return () => {};
    // `config.storageKey` is deliberately NOT a dependency here. Reloading on
    // a key change belongs to the first effect, which is the one that swaps
    // `clickData`. Listing the key here as well made this effect re-run in the
    // SAME commit as the change, still closing over the PREVIOUS key's
    // clickData, and re-assert the cooldown on top of the reset the other
    // effect had just done — that is how a cooldown started on the Entregas
    // tab showed up on Ocorrências. Loading always hands back a fresh object,
    // so the clickData dependency already re-runs this effect with the right
    // data on the very next render.
  }, [isClient, clickData, config.timeWindowMs]);

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
      (timestamp: number) => now - timestamp < config.timeWindowMs,
    );

    // Check if the limit has been exceeded
    if (validClicks.length > config.maxClicks) {
      // Activates cooldown
      const updatedData = {
        clicks: validClicks,
        isLimited: true,
        cooldownEndTime: now + config.cooldownTimeMs,
      };

      setClickData(updatedData);

      // Save to localStorage
      saveStorageData(updatedData, config.storageKey);

      setIsRateLimited(true);
      setCooldownRemaining(Math.ceil(config.cooldownTimeMs / 1000));

      // Notifies the user
      toast.warning(
        `Muitas solicitações! Aguarde ${Math.ceil(config.cooldownTimeMs / 1000)} segundos.`,
      );

      // No timer here, on purpose. Setting clickData above re-runs the
      // cooldown effect, which owns the ticking interval and — unlike this
      // place — clears it when the component goes away. The timer that used to
      // live here was a second one counting the same cooldown, never cleared,
      // still holding the storage key captured at click time. It outlived the
      // tab it belonged to and drove the counter of whatever tab came next.
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
