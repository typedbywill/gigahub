import type { CustomerStatus } from './customer';

/** IXC `cliente.ativo` — S = sim, N = não. */
export type IxcCustomerAtivo = 'S' | 'N' | string;

/**
 * IXC `cliente.status_internet` — N normal, A ativo, D desativado,
 * CM/CA/CE/FA variantes de bloqueio/corte.
 */
export type IxcCustomerStatusInternet =
  | 'N'
  | 'A'
  | 'D'
  | 'CM'
  | 'CA'
  | 'CE'
  | 'FA'
  | string;

const BLOCKED_INTERNET_STATUSES: ReadonlySet<string> = new Set([
  'CM',
  'CA',
  'CE',
  'FA',
]);

/**
 * Maps IXC operational flags to the GigaHub customer lifecycle status.
 * Policy lives in domain — adapters only pass raw IXC values.
 */
export function mapIxcCustomerStatus(
  ativo: IxcCustomerAtivo | null | undefined,
  statusInternet: IxcCustomerStatusInternet | null | undefined,
): CustomerStatus {
  if (ativo === 'N') {
    return 'inactive';
  }

  const internet = statusInternet?.trim().toUpperCase();
  if (internet === 'D') {
    return 'cancelled';
  }
  if (internet && BLOCKED_INTERNET_STATUSES.has(internet)) {
    return 'blocked';
  }
  if (internet === 'A' || internet === 'N') {
    return 'active';
  }

  return ativo === 'S' ? 'active' : 'inactive';
}
