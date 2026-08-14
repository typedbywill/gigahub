import type { CustomerConsultationResponseDto } from '@gigahub/shared/contracts';
import { Customer } from '@gigahub/domain/customer';
import { GetCustomerConsultationUseCase } from './get-customer-consultation.use-case';
import type {
  CustomerConsultationQuery,
  CustomerRegistrationQuery,
  CustomerRemoteAccessPort,
} from './ports';

describe('GetCustomerConsultationUseCase', () => {
  const customer = Customer.create({
    id: '42',
    idErp: '42',
    name: 'Maria Silva',
    status: 'active',
  });

  const registration: CustomerRegistrationQuery = {
    findByIdErp: jest.fn(async () => customer),
  };

  const consultation: CustomerConsultationQuery = {
    loadSnapshot: jest.fn(async () => ({
      activeContractIdErp: '10',
      activeLoginIdErp: '5',
      activeFiberIdErp: '7',
      loginIp: '10.0.0.1',
    })),
    loadContracts: jest.fn(async () => ({ total: 0, items: [] })),
    loadLogins: jest.fn(async () => ({ total: 0, items: [] })),
    loadFibra: jest.fn(async () => ({ total: 0, items: [] })),
    loadFibraHistorico: jest.fn(async () => ({ total: 0, items: [] })),
    loadFaturas: jest.fn(async () => ({ total: 0, items: [] })),
    loadComodatos: jest.fn(async () => ({ total: 0, items: [] })),
    loadSenhasWifi: jest.fn(async () => []),
  };

  const remoteAccess: CustomerRemoteAccessPort = {
    checkPorts: jest.fn(async () => [{ port: 80, isOpen: true }]),
  };

  const access = {
    assertCan: jest.fn(async () => undefined),
  };

  it('returns cadastro section for a known customer', async () => {
    const useCase = new GetCustomerConsultationUseCase(
      registration,
      consultation,
      null,
      remoteAccess,
      access as never,
    );

    const result: CustomerConsultationResponseDto = await useCase.execute({
      actorUserId: 'user-1',
      customerIdErp: '42',
      include: ['cadastro'],
    });

    expect(result.found).toBe(true);
    expect(result.data.cadastro?.name).toBe('Maria Silva');
  });
});
