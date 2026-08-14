import type { CustomerSignalReaderPort } from '@gigahub/application-customer';

/**
 * Placeholder until NOC/signal-reader integration is wired.
 * GetCustomerConsultationUseCase treats null port as "serviço NOC não configurado".
 */
export class NullCustomerSignalReaderAdapter
  implements CustomerSignalReaderPort
{
  async readSignal(fiberIdsErp: string[]) {
    return fiberIdsErp.map((fiberIdErp) => ({
      fiberIdErp,
      error: 'NOC signal reader not configured',
    }));
  }
}
