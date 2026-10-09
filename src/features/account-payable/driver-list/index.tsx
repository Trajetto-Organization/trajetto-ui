"use client";

import { useState } from "react";
import { Loader, Receipt, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshButton } from "@/components/shared/custom/refresh-button";

import { useRevalidateScreen } from "@/hooks/use-revalidate-screen";

import { useAccountPayableByResponsibleUserInfiniteScroll } from "@/app/(protected)/_components/shared/searches/search-account-payable-by-responsible-user/hooks/account-payable-by-responsible-user-infinite-scroll";

import { formatAccountPayableCategory } from "@/lib/account-payable-category";
import {
  displayValue,
  formatDateOnly,
  formatToBrazilianCurrency,
} from "@/lib/format-values";

import type { AccountPayableRow } from "../lib/server-table";
import { payeeLabel } from "../lib/stats-data";
import { statusMetaOf } from "../lib/status";

const Field = ({
  label,
  value,
  className,
}: {
  label: string;
  value: string | null | undefined;
  className?: string;
}): JSX.Element => (
  <div className={className}>
    <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
      {label}
    </p>
    <p className="truncate text-sm font-medium" title={value ?? undefined}>
      {displayValue(value)}
    </p>
  </div>
);

const BillCard = ({ bill }: { bill: AccountPayableRow }): JSX.Element => {
  const status = statusMetaOf(bill.status);

  return (
    <Card className="w-full p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Receipt
            className="h-5 w-5 shrink-0 text-primary"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Favorecido</p>
            <p className="truncate text-sm font-semibold">
              {displayValue(payeeLabel(bill))}
            </p>
          </div>
        </div>
        <Badge variant="outline" className={`shrink-0 ${status.className}`}>
          {status.label}
        </Badge>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-3">
        <Field label="Valor" value={formatToBrazilianCurrency(bill.amount)} />
        <Field
          label="Pago"
          value={
            bill.amount_paid !== null
              ? formatToBrazilianCurrency(bill.amount_paid)
              : null
          }
        />
        <Field
          label="Restante"
          value={formatToBrazilianCurrency(bill.remaining_amount)}
        />
      </div>

      <div className="mb-3 grid grid-cols-2 gap-3">
        {/* The company's days, as days: never shifted by this phone's zone. */}
        <Field label="Vencimento" value={formatDateOnly(bill.due_day)} />
        <Field
          label="Pagamento"
          value={bill.payment_day ? formatDateOnly(bill.payment_day) : null}
        />
      </div>

      <div className="space-y-2 border-t pt-3 text-xs">
        <p className="truncate">
          <span className="text-muted-foreground">Categoria: </span>
          <span className="font-medium">
            {formatAccountPayableCategory(bill.category)}
          </span>
        </p>
        {bill.description && (
          <p className="line-clamp-2" title={bill.description}>
            <span className="text-muted-foreground">Descrição: </span>
            <span className="font-medium">{bill.description}</span>
          </p>
        )}
        {bill.document_number && (
          <p className="truncate">
            <span className="text-muted-foreground">Documento: </span>
            <span className="font-medium">{bill.document_number}</span>
          </p>
        )}
        {bill.vehicle && (
          <p className="truncate">
            <span className="text-muted-foreground">Veículo: </span>
            <span className="font-medium">{bill.vehicle.license_plate}</span>
          </p>
        )}
      </div>
    </Card>
  );
};

/**
 * "Minhas contas a pagar": the bills the signed-in person is responsible
 * for (decision 4.5) — a driver among them, sent here by the notification.
 *
 * The API route answered 403 to drivers; it is self-scoped now. The status
 * is the API's, by the company's business day: the page used to compute it
 * from this device's clock, and called a bill "Vencido" on the day it was
 * due. The search goes to the server; it used to filter only the cards
 * already loaded.
 */
const DriverAccountPayableList = (): JSX.Element => {
  const [search, setSearch] = useState<string>("");

  const {
    accountPayables,
    lastElementRef,
    isLoading,
    isFetching,
    hasError,
    errorMessage,
    refetch,
  } = useAccountPayableByResponsibleUserInfiniteScroll(search);

  const bills = (accountPayables ?? []) as AccountPayableRow[];

  // Atualizar on every page, rate limited, the whole tab (decision 2.1).
  const { revalidate, isRevalidating } = useRevalidateScreen();

  return (
    <div className="mt-7 space-y-6" data-tutorial="driver-payables">
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
        <div
          className="relative w-full sm:max-w-md"
          data-tutorial="driver-payables-search"
        >
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            // The API caps the term at 100 characters.
            maxLength={100}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por favorecido, descrição, documento ou placa..."
            aria-label="Buscar contas a pagar"
            className="pl-9"
          />
        </div>

        <RefreshButton
          storageKey="driver-account-payable"
          isRefreshing={isRevalidating}
          onRefresh={revalidate}
          className="h-10 w-full sm:ml-auto sm:w-auto"
        />
      </div>

      {hasError && (
        <div className="space-y-3 py-6 text-center">
          <p className="text-sm text-destructive">
            {errorMessage || "Erro ao carregar as contas a pagar"}
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </div>
      )}

      {!hasError && isLoading && bills.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <Loader className="h-6 w-6 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">
              Carregando contas a pagar...
            </span>
          </div>
        </div>
      )}

      {!hasError && !isLoading && bills.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {search
            ? "Nenhuma conta a pagar encontrada para esta busca."
            : "Nenhuma conta a pagar em que você é o responsável."}
        </p>
      )}

      {bills.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bills.map((bill, index) => (
            <div
              key={bill.id}
              ref={index === bills.length - 1 ? lastElementRef : undefined}
            >
              <BillCard bill={bill} />
            </div>
          ))}
        </div>
      )}

      {isFetching && bills.length > 0 && !hasError && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((key) => (
            <Card key={key} className="space-y-3 p-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export { DriverAccountPayableList };
