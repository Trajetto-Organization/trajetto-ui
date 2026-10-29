"use client";

import { ThemeSegmented } from "@/components/shared/theme-toggle";

import { ProtectedContentSectionColumns } from "../../../layout/protected-content-section-collumns";

/**
 * "Aparência" in the profile: the full choice, "Sistema" included, for
 * whoever looks for the theme among the account settings. It is a device
 * preference (stored in this browser, like the header switch), and the copy
 * says so.
 */
const UserAppearance = (): JSX.Element => (
  <ProtectedContentSectionColumns
    title="Aparência"
    description="Escolha o tema da interface. Em “Sistema”, o Trajetto acompanha o tema do seu dispositivo."
  >
    <div className="flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <span className="text-[15px] font-medium">Tema</span>
        <span className="text-balance text-sm text-muted-foreground">
          Vale para este navegador.
        </span>
      </div>
      <div>
        <ThemeSegmented
          tone="app"
          showLabel={false}
          className="[&>[role=radiogroup]]:w-full sm:[&>[role=radiogroup]]:w-auto"
        />
      </div>
    </div>
  </ProtectedContentSectionColumns>
);

export { UserAppearance };
