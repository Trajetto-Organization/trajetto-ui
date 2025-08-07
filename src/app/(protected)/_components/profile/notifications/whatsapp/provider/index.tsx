"use client";

import { createContext, useContext, useState, ReactNode, useRef } from "react";

import { WhatsAppSettings, SyncProgressData } from "../dto";
import { useWhatsAppGlobalEvents } from "../hooks/useWhatsAppGlobalEvents";

interface WhatsAppContextType {
  settings: WhatsAppSettings | null;
  syncProgress: SyncProgressData | null;
  showSyncProgress: boolean;
  showConnectionConfirmation: boolean;
  isUpdatingSettings: boolean;
  updateSettings: (settings: WhatsAppSettings) => void;
  clearSyncProgress: () => void;
  setUpdatingSettings: (updating: boolean) => void;
}

const WhatsAppContext = createContext<WhatsAppContextType>({
  settings: null,
  syncProgress: null,
  showSyncProgress: false,
  showConnectionConfirmation: false,
  isUpdatingSettings: false,
  updateSettings: () => {},
  clearSyncProgress: () => {},
  setUpdatingSettings: () => {},
});

interface WhatsAppProviderProps {
  children: ReactNode;
  initialSettings: WhatsAppSettings | null;
}

const WhatsAppProvider = ({
  children,
  initialSettings,
}: WhatsAppProviderProps): JSX.Element => {
  const [settings, setSettings] = useState<WhatsAppSettings | null>(
    initialSettings,
  );

  const [syncProgress, setSyncProgress] = useState<SyncProgressData | null>(
    null,
  );

  const [showSyncProgress, setShowSyncProgress] = useState<boolean>(false);
  const [showConnectionConfirmation, setShowConnectionConfirmation] = useState(
    initialSettings?.instanceConnected || false,
  );

  // State to track when user is actively updating settings
  const [isUpdatingSettings, setIsUpdatingSettings] = useState<boolean>(false);

  // Track user operations with more specific timing
  const lastUserOperationRef = useRef<{
    action: string;
    timestamp: number;
    phoneChanged?: boolean;
  } | null>(null);

  /**
   * 🔄 Update settings with improved conflict prevention
   */
  const updateSettings = (newSettings: WhatsAppSettings) => {
    // ✅ Track user operation with more details
    const isEnabling = newSettings.enabled && !settings?.enabled;
    const isDisabling = !newSettings.enabled && settings?.enabled;

    const isPhoneChanging = newSettings.phoneNumber !== settings?.phoneNumber;

    if (isEnabling || isDisabling) {
      lastUserOperationRef.current = {
        action: isEnabling
          ? isPhoneChanging
            ? "enabling_with_new_phone"
            : "enabling"
          : "disabling",
        timestamp: Date.now(),
        phoneChanged: isPhoneChanging,
      };

      // ✅ Clear the tracking after 60 seconds for phone changes, 15 for normal operations
      const clearTimeout = isPhoneChanging ? 60000 : 15000;
      setTimeout(() => {
        if (
          lastUserOperationRef.current &&
          Date.now() - lastUserOperationRef.current.timestamp > clearTimeout
        ) {
          lastUserOperationRef.current = null;
        }
      }, clearTimeout);
    }

    setSettings(newSettings);
    setShowConnectionConfirmation(newSettings.instanceConnected);

    // If disconnected, clear progress
    if (!newSettings.instanceConnected) {
      setSyncProgress(null);
      setShowSyncProgress(false);
    }
  };

  /**
   * 🧹 Clear Sync Progress
   */
  const clearSyncProgress = () => {
    setSyncProgress(null);
    setShowSyncProgress(false);
  };

  /**
   * ⚙️ Control updating state
   */
  const setUpdatingSettings = (updating: boolean) => {
    setIsUpdatingSettings(updating);
  };

  // 🔧 WEBSOCKET HANDLERS with improved conflict prevention
  const handleConnectionUpdate = (isConnected: boolean, data?: any) => {
    // Only block during active settings updates
    if (isUpdatingSettings) {
      return;
    }

    // More specific logic to avoid conflicts
    if (lastUserOperationRef.current) {
      const timeDiff = Date.now() - lastUserOperationRef.current.timestamp;
      const action = lastUserOperationRef.current.action;

      // For connections: only block if it was a very recent "enabling" action
      if (isConnected && action === "enabling" && timeDiff < 5000) {
        return;
      }

      // For disconnections: only block if it was a very recent "disabling" action
      if (!isConnected && action === "disabling" && timeDiff < 3000) {
        return;
      }
    }

    if (settings) {
      const updatedSettings = {
        ...settings,
        instanceConnected: isConnected,
      };

      updateSettings(updatedSettings);

      if (isConnected) {
        lastUserOperationRef.current = null;

        // Starts progress monitoring after connecting
        setTimeout(() => {
          setShowSyncProgress(true);
        }, 2000);
      }
    }
  };

  const handleWhatsAppDisabled = (data?: any) => {
    // Detect if it is an external deletion or duplicate cleanup
    const isExternalDeletion =
      data?.reason === "Instance deleted externally" ||
      data?.reason === "duplicate_connection" ||
      data?.deleted === true ||
      data?.external === true;

    // Only block updates during active configuration operations
    if (isUpdatingSettings) {
      return;
    }

    // For external deletions, ALWAYS process (do not block by timing)
    if (isExternalDeletion) {
      if (settings && settings.enabled) {
        const updatedSettings = {
          ...settings,
          enabled: false,
          instanceConnected: false,
        };

        updateSettings(updatedSettings);
        return;
      }
    }

    if (lastUserOperationRef.current?.action === "disabling") {
      const timeDiff = Date.now() - lastUserOperationRef.current.timestamp;
      if (timeDiff < 3000) {
        // Just 3 seconds to avoid loops
        return;
      }
    }

    if (settings && settings.enabled) {
      const updatedSettings = {
        ...settings,
        enabled: false,
        instanceConnected: false,
      };

      updateSettings(updatedSettings);
    }
  };

  // 🔧 GLOBAL EVENTS SETUP
  useWhatsAppGlobalEvents({
    onConnectionUpdate: handleConnectionUpdate,
    onWhatsAppDisabled: handleWhatsAppDisabled,
  });

  const contextValue: WhatsAppContextType = {
    settings,
    syncProgress,
    showSyncProgress,
    showConnectionConfirmation,
    isUpdatingSettings,
    updateSettings,
    clearSyncProgress,
    setUpdatingSettings,
  };

  return (
    <WhatsAppContext.Provider value={contextValue}>
      {children}
    </WhatsAppContext.Provider>
  );
};

function useWhatsAppContext() {
  const context = useContext(WhatsAppContext);

  if (!context) {
    throw new Error("useWhatsAppContext must be used within WhatsAppProvider");
  }

  return context;
}

export { WhatsAppProvider, useWhatsAppContext };
