type QuoteStatus = "PENDING" | "CONTACTED" | "CLOSED" | "CONVERTED";

interface QuoteProps {
  id: string;
  name: string;
  company: string;
  email: string;
  telephone: string;
  fleet_size: string;
  message?: string | null;
  status: QuoteStatus;
  contacted_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type { QuoteProps, QuoteStatus };
