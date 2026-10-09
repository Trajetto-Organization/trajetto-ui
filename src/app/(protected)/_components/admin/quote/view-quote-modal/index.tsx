"use client";

import Link from "next/link";
import {
  Dialog,
  DialogScrollContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import type { QuoteProps } from "../quote.types";
import {
  Building2,
  Mail,
  Phone,
  Car,
  Calendar,
  MessageSquare,
  FileText,
  Contact,
} from "lucide-react";

import { formatNotificationDate } from "@/lib/format-values";

interface ViewQuoteModalProps {
  quote: QuoteProps;
  isOpen: boolean;
  onClose: () => void;
}

const statusColors = {
  PENDING: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  CONTACTED: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  CLOSED: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  CONVERTED: "bg-green-500/10 text-green-600 dark:text-green-400",
};

const statusLabels = {
  PENDING: "Pendente",
  CONTACTED: "Contatado",
  CLOSED: "Fechado",
  CONVERTED: "Convertido",
};

export function ViewQuoteModal({
  quote,
  isOpen,
  onClose,
}: ViewQuoteModalProps) {
  const fleetLabels: Record<string, string> = {
    "1-5": "1 a 5 veículos",
    "6-15": "6 a 15 veículos",
    "16-30": "16 a 30 veículos",
    "31-50": "31 a 50 veículos",
    "51-100": "51 a 100 veículos",
    "101+": "Mais de 100 veículos",
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogScrollContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">Detalhes do Orçamento</DialogTitle>
            <Badge variant={"outline"} className={statusColors[quote.status]}>
              {statusLabels[quote.status]}
            </Badge>
          </div>
          <DialogDescription>
            Visualize todas as informações detalhadas da solicitação de
            orçamento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3">
              Informações do Cliente
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />

                <span className="text-sm font-medium">Empresa:</span>
                <span className="text-sm">{quote.company}</span>
              </div>
              <div className="flex items-center gap-2">
                <Contact className="h-4 w-4 text-muted-foreground" />

                <span className="text-sm font-medium">Contato:</span>
                <span className="text-sm">{quote.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">E-mail:</span>

                <Link
                  href={`mailto:${quote.email}`}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {quote.email}
                </Link>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Telefone:</span>

                <Link
                  href={`tel:${quote.telephone}`}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {quote.telephone}
                </Link>
              </div>
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Tamanho da Frota:</span>

                <span className="text-sm">
                  {fleetLabels[quote.fleet_size] || quote.fleet_size}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Customer Message */}
          {quote.message && (
            <>
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Mensagem do Cliente
                </h3>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm whitespace-pre-wrap">{quote.message}</p>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Internal Notes */}
          {quote.notes && (
            <>
              <div>
                <h3
                  className="text-lg font-semibold mb-3 
                  flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Notas Internas
                </h3>
                <div
                  className="bg-blue-50/50 dark:bg-blue-950/20 rounded-lg 
                  p-4 border border-blue-200 dark:border-blue-800"
                >
                  <p className="text-sm whitespace-pre-wrap">{quote.notes}</p>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Dates */}
          <div>
            <h3
              className="text-lg font-semibold mb-3 
              flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              Informações de Tempo
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Criado em:</span>
                <span className="text-sm">
                  {formatNotificationDate(quote.created_at)}
                </span>
              </div>
              {quote.contacted_at && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Contatado em:</span>
                  <span className="text-sm">
                    {formatNotificationDate(quote.contacted_at)}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Última atualização:</span>
                <span className="text-sm">
                  {formatNotificationDate(quote.updated_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Budget ID */}
          <div className="pt-4 border-t">
            <div
              className="flex items-center gap-2 
              text-xs text-muted-foreground"
            >
              <span>ID do Orçamento:</span>
              <code
                className="px-2 py-1 
                bg-muted rounded"
              >
                {quote.id}
              </code>
            </div>
          </div>
        </div>
      </DialogScrollContent>
    </Dialog>
  );
}
