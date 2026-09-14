interface AccountPayableProps {
  id: string;
  issue_date: Date | string;
  due_date: Date | string;
  payment_date: Date | string | null;
  amount: number;
  amount_paid: number | null;
  category?: string | null;
  category_description?: string | null;
  businessId: string;
  branchId: string;
  serviceOrderId: string | null;
  registrationUserId: string;
  created_at: Date | string;
  updated_at: Date | string;
  business?: {
    corporate_reason: string;
  };
  branch?: {
    corporate_reason: string;
    fantasy_name: string | null;
  };
  serviceOrder?: {
    id: string;
    date: Date | string;
    maintenance_type: string;
    vehicle: {
      license_plate: string;
      description: string;
    };
  } | null;
  registrationUser?: {
    name: string;
  };
}

export type { AccountPayableProps };
