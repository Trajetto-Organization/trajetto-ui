"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Maximize2, Minimize2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  DEFAULT_TOWER_REFRESH_MINUTES,
  TOWER_REFRESH_MINUTES,
  isTowerRefreshMinutes,
  readTowerRefreshMinutes,
  refreshCadenceLabel,
  writeTowerRefreshMinutes,
  type TowerRefreshMinutes,
} from "../lib/refresh-interval";
import {
  readRememberedTowerView,
  rememberTowerView,
  towerViewHref,
  type TowerView,
} from "../lib/views";
import { formatEventMoment } from "../lib/tower-format";

import {
  TowerRefreshContext,
  useTowerAutoRefresh,
  useTowerLastUpdate,
} from "./refresh";
import { useFullscreen } from "./use-fullscreen";

interface ControlTowerShellProps {
  view: TowerView;
  /**
   * Whether the URL named the view. When it did not, the view this browser
   * chose last replaces the default.
   */
  urlNamedView: boolean;
  allowedViews: readonly TowerView[];
  /** When the server rendered this view (ms), for the part it feeds. */
  renderedAt: number;
  /**
   * Whether the frame holds a view to read again. False on the company
   * prompt and on a refusal: no cadence runs there, and none is announced.
   */
  live?: boolean;
  /** The company, the actions and the views strip. */
  header: ReactNode;
  children: ReactNode;
}

/**
 * "14:32": the moment the screen last changed, in the zone the view shows
 * its own times in — the company's when its data names it (the board, the
 * map), with the same formatter those views use. It used to be the
 * browser's clock, an hour or more off the board's for a dispatcher in
 * another state.
 */
function timeOf(at: number, timeZone: string | undefined): string {
  return formatEventMoment(new Date(at).toISOString(), undefined, timeZone);
}

/**
 * The Torre de controle around its views (product meeting of 14/10/2026):
 * the cadence every view refreshes on (1, 3 or 5 min, per browser), when it
 * last did, the full screen for a TV on the wall, and the last view chosen
 * in this browser.
 *
 * The views keep their sockets; this is the floor under them.
 */
const ControlTowerShell = ({
  view,
  urlNamedView,
  allowedViews,
  renderedAt,
  live = true,
  header,
  children,
}: ControlTowerShellProps): JSX.Element => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const fullscreen = useFullscreen();

  // The default on the server and on the first paint; the browser's own
  // choice right after, so both renders agree.
  const [minutes, setMinutes] = useState<TowerRefreshMinutes>(
    DEFAULT_TOWER_REFRESH_MINUTES,
  );

  useEffect(() => {
    setMinutes(readTowerRefreshMinutes());
  }, []);

  useTowerAutoRefresh(view, minutes, live);

  const lastUpdate = useTowerLastUpdate(view, renderedAt);

  // The view named in the URL is the one to come back to. With none named,
  // the one this browser chose last, when the session may still read it.
  // The menu and ⌘K already link to that view (lib/views, towerEntryHref),
  // so the server renders it at once; this catches the bare links left —
  // a notice, a bookmark, a typed address.
  useEffect(() => {
    if (urlNamedView) {
      rememberTowerView(view);
      return;
    }

    const remembered = readRememberedTowerView();

    if (
      remembered &&
      remembered !== view &&
      allowedViews.includes(remembered)
    ) {
      router.replace(towerViewHref(searchParams, view, remembered), {
        scroll: false,
      });
    }
  }, [urlNamedView, view, allowedViews, router, searchParams]);

  const chooseMinutes = (value: string) => {
    const next = Number(value);

    if (!isTowerRefreshMinutes(next)) return;

    setMinutes(next);
    writeTowerRefreshMinutes(next);
  };

  const fullscreenLabel = fullscreen.isFullscreen
    ? "Sair da tela cheia"
    : "Tela cheia";

  return (
    <TowerRefreshContext.Provider value={{ minutes }}>
      <div
        data-control-tower-shell
        data-fullscreen={fullscreen.isFullscreen ? "" : undefined}
        className={cn(
          "my-6 space-y-6",
          // Pinned over the page in both modes — the browser's full screen is
          // the whole page's, so the dialogs and menus (z-50, portalled to
          // the body) still open above the Torre.
          fullscreen.isFullscreen &&
            "fixed inset-0 z-40 my-0 overflow-auto bg-background p-4",
        )}
      >
        {header}

        <div
          className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground"
          data-tutorial="control-tower-live"
        >
          {/*
            Not a live region: the time changes with every refresh, and a
            screen reader announced it every minute over whatever the person
            was reading. The interval's own change is said by the select.
          */}
          {live && (
            <span data-tower-cadence>
              {refreshCadenceLabel(minutes)}
              {lastUpdate !== null &&
                ` · Atualizado às ${timeOf(lastUpdate.at, lastUpdate.timeZone)}`}
            </span>
          )}

          {live && (
            <label className="flex items-center gap-2 sm:ml-auto">
              <span>Atualizar a cada</span>
              {/* Native: three options need no portal nor a Radix layer. */}
              <select
                value={minutes}
                onChange={(event) => chooseMinutes(event.target.value)}
                aria-label="Intervalo de atualização da torre"
                data-tower-refresh-select
                className="h-8 rounded-md border border-input bg-background px-2 text-xs
                text-foreground focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-ring"
              >
                {TOWER_REFRESH_MINUTES.map((option) => (
                  <option key={option} value={option}>
                    {option} min
                  </option>
                ))}
              </select>
            </label>
          )}

          {/*
            One toggle pattern: the name says what a press does next ("Tela
            cheia" / "Sair da tela cheia"). `aria-pressed` on top of a name
            that changes read as "Sair da tela cheia, pressionado" — two
            states for one fact.
          */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={cn("h-8 gap-1.5", !live && "sm:ml-auto")}
            onClick={fullscreen.toggle}
            aria-label={fullscreenLabel}
            data-tutorial="control-tower-fullscreen"
          >
            {fullscreen.isFullscreen ? (
              <Minimize2 className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Maximize2 className="h-4 w-4" aria-hidden="true" />
            )}
            {fullscreenLabel}
          </Button>
        </div>

        {children}
      </div>
    </TowerRefreshContext.Provider>
  );
};

export { ControlTowerShell };
