interface AccountPayableProps {
  id: string;
  issue_date: string;
  due_date: string;
  payment_date?: string | null;
  amount: string;
  amount_paid?: string | null;
  businessId: string;
  branchId: string;
  serviceOrderId?: string | null;
  registrationUserId: string;
  branchName: string;
  business_name?: string;
  serviceOrderDescription?: string;
  registrationUserName?: string;
  status?: string;
  remainingAmount?: string;
  created_at: string;
  updated_at: string;
}

export type { AccountPayableProps };
