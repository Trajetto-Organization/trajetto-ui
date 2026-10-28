import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { relayUrl } from "@/lib/api-relay-paths";

import type { BulkConfigurePermissionsFormState } from "../bulk-configure-permissions-dialog.types";
import { permissions as PERMISSIONS } from "@/lib/permissions";

import { toast } from "sonner";

type AccessLevel = "none" | "read" | "write";
type PermissionConfigMap = Record<string, AccessLevel>;

const ALL_PERMISSION_KEYS = Object.values(PERMISSIONS) as string[];

const createInitialConfig = (): PermissionConfigMap =>
  Object.fromEntries(ALL_PERMISSION_KEYS.map((key) => [key, "none"]));

function useBulkConfigurePermissionsDialog(
  state: BulkConfigurePermissionsFormState | null,
  isOpen: boolean,
  onClose: () => void,
  profileAccessId: string,
  businessId: string,
) {
  const formRef = useRef<HTMLFormElement>(null);

  const toastShownRef = useRef(false);
  const hasFetchedRef = useRef(false);

  const [config, setConfig] =
    useState<PermissionConfigMap>(createInitialConfig);

  const [initialConfig, setInitialConfig] =
    useState<PermissionConfigMap>(createInitialConfig);
  const [isLoadingPermissions, setIsLoadingPermissions] =
    useState<boolean>(false);

  const isDirty = useMemo(
    () => ALL_PERMISSION_KEYS.some((key) => config[key] !== initialConfig[key]),
    [config, initialConfig],
  );

  const handleClose = () => {
    hasFetchedRef.current = false;

    setConfig(createInitialConfig());
    setInitialConfig(createInitialConfig());

    onClose();
  };

  const fetchExistingPermissions = useCallback(async () => {
    setIsLoadingPermissions(true);

    try {
      const response = await fetch(
        relayUrl(
          `/permission/list-by-profile/${encodeURIComponent(profileAccessId)}`,
          new URLSearchParams({ businessId }),
        ),
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (response.status === 401) {
        toast.error("Sessão expirada. Por favor, faça login novamente.");
        return;
      }

      if (!response.ok) {
        throw new Error("Falha ao buscar permissões do perfil.");
      }

      const data = await response.json();
      const newConfig = createInitialConfig();

      for (const p of data.permissions) {
        if (p.permissionKey in newConfig) {
          if (p.canWrite) newConfig[p.permissionKey] = "write";
          else if (p.canRead) newConfig[p.permissionKey] = "read";
        }
      }

      setConfig(newConfig);
      setInitialConfig(newConfig);
    } catch (error) {
      toast.error("Erro ao carregar permissões existentes.");
    } finally {
      setIsLoadingPermissions(false);
    }
  }, [profileAccessId, businessId]);

  useEffect(() => {
    if (!isOpen || hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    fetchExistingPermissions();
  }, [isOpen, fetchExistingPermissions]);

  useEffect(() => {
    if (
      state?.bulkConfigurePermissionsError?.bulkConfigurePermissionsErrorMessage
    ) {
      toast.error(
        state.bulkConfigurePermissionsError
          .bulkConfigurePermissionsErrorMessage,
      );

      return;
    }

    if (state?.successMessage && !toastShownRef.current) {
      toastShownRef.current = true;
      toast.success(state.successMessage);

      // The action re-rendered the screen in its own response.
      handleClose();
    }

    return () => {
      toastShownRef.current = false;
    };
  }, [state]);

  return {
    formRef,
    config,
    setConfig,
    isLoadingPermissions,
    isDirty,
    handleClose,
  };
}

export { useBulkConfigurePermissionsDialog, type PermissionConfigMap };
