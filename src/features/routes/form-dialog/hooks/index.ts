"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

import { routeDetailHref } from "../../lib/route-links";

import { revalidateTagName } from "@/actions/revalidate";

import type { RouteFormState } from "../index";

interface UseRouteFormProps {
  state: RouteFormState;
  onClose: () => void;
  isEditing: boolean;
  businessId: string;

  /** A caller that takes over after the create (see RouteFormDialog). */
  onCreated?: (created: { id: string; code: number }) => void | Promise<void>;

  /** Edit mode: a 409 ROUTE_PLAN_STALE goes to the page, which reloads. */
  onConflict?: (message: string) => void | Promise<void>;
}

/**
 * Reacts to what the server action returned.
 *
 * `toastShownRef` is not optional: `useFormState` re-runs this effect on every
 * render that touches the state, and without the guard the success toast
 * fires twice for one save.
 */
function useRouteForm({
  state,
  onClose,
  isEditing,
  businessId,
  onCreated,
  onConflict,
}: UseRouteFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  const router = useRouter();
  const pathname = usePathname();

  // Read at the success, not a dependency: a new callback per render must not
  // replay the effect.
  const onCreatedRef = useRef(onCreated);

  onCreatedRef.current = onCreated;

  const onConflictRef = useRef(onConflict);

  onConflictRef.current = onConflict;
  const toastShownRef = useRef<boolean>(false);

  useEffect(() => {
    const errorMessage =
      (state?.createRouteError?.createRouteErrorMessage as string) ??
      (state?.updateRouteError?.updateRouteErrorMessage as string);

    // Somebody changed the plan since the dialog opened: the page reloads
    // the route and says so (it owns that toast).
    if (
      errorMessage &&
      state?.updateRouteError?.code === "ROUTE_PLAN_STALE" &&
      onConflictRef.current
    ) {
      onClose();
      void onConflictRef.current(errorMessage);
      return;
    }

    if (errorMessage) {
      toast.error(errorMessage);
      return;
    }

    if (state?.successMessage && !toastShownRef.current) {
      toastShownRef.current = true;

      const created = state.createdRoute;
      const handOver = !isEditing && created ? onCreatedRef.current : undefined;

      if (handOver && created) {
        void handOver(created);
      } else {
        // A new route is born in planning and, from Rotas, empty: the toast
        // says where to fill it and opens that page (decision 14.7).
        toast.success(
          state.successMessage,
          isEditing || !created
            ? undefined
            : {
                description:
                  "Abra a rota para escolher as entregas e definir a sequência. Nada chega ao motorista até você liberar.",
                action: {
                  label: "Abrir rota",
                  onClick: () =>
                    router.push(
                      routeDetailHref(pathname, created.id, businessId),
                    ),
                },
              },
        );
      }

      const performRevalidation = async () => {
        try {
          await revalidateTagName("update-route");
        } catch (error) {
          toast.error("Erro ao atualizar dados. Recarregue a página.");
        }
      };

      void performRevalidation();
      onClose();
    }

    return () => {
      toastShownRef.current = false;
    };
  }, [state, onClose, isEditing, router, pathname, businessId]);

  return { formRef };
}

export { useRouteForm };
