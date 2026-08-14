import React, { createContext, useContext } from 'react';
import type { CustomerConsultationResponseDto } from '@gigahub/shared/contracts';

export interface CustomerContextValue {
  customerId: string;
  consultation: CustomerConsultationResponseDto | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const CustomerContext = createContext<CustomerContextValue | null>(null);

export function useCustomerContext(): CustomerContextValue {
  const context = useContext(CustomerContext);
  if (!context) {
    throw new Error('useCustomerContext must be used within a CustomerContextProvider');
  }
  return context;
}
