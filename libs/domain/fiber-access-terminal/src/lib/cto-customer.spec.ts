import { DomainError, DomainErrorCodes } from '@gigahub/shared/kernel';
import {
  CtoCustomer,
  CtoCustomerList,
  generateMockOpticalSignal,
} from './cto-customer';

describe('CtoCustomer Domain Entity', () => {
  it('creates a valid CtoCustomer with default optical signal mock', () => {
    const customer = CtoCustomer.create({
      radUsuarioId: '10293',
      clienteId: '5541',
      contratoId: '8821',
      login: 'joao.silva@fibra',
      mac: '48:8A:D2:11:22:33',
      portaFtth: 3,
      razaoSocial: 'João da Silva',
      cpfCnpj: '123.456.789-00',
      online: true,
    });

    expect(customer.radUsuarioId).toBe('10293');
    expect(customer.clienteId).toBe('5541');
    expect(customer.contratoId).toBe('8821');
    expect(customer.login).toBe('joao.silva@fibra');
    expect(customer.portaFtth).toBe(3);
    expect(customer.razaoSocial).toBe('João da Silva');
    expect(customer.online).toBe(true);
    expect(customer.signal.isMock).toBe(true);
    expect(customer.signal.rxPowerDbm).toBeLessThanOrEqual(-18);
    expect(customer.signal.quality).toBeDefined();
  });

  it('generates offline optical signal when customer is offline', () => {
    const signal = generateMockOpticalSignal('10293', 3, false);
    expect(signal.quality).toBe('OFFLINE');
    expect(signal.rxPowerDbm).toBe(-40.0);
    expect(signal.txPowerDbm).toBe(0.0);
    expect(signal.isMock).toBe(true);
  });

  it('rejects invalid portaFtth <= 0 or > 128', () => {
    expect(() =>
      CtoCustomer.create({
        radUsuarioId: '10293',
        clienteId: '5541',
        login: 'joao.silva@fibra',
        portaFtth: 0,
        razaoSocial: 'João da Silva',
        online: true,
      }),
    ).toThrow(DomainError);

    expect(() =>
      CtoCustomer.create({
        radUsuarioId: '10293',
        clienteId: '5541',
        login: 'joao.silva@fibra',
        portaFtth: 129,
        razaoSocial: 'João da Silva',
        online: true,
      }),
    ).toThrow(DomainError);
  });

  it('rejects empty required fields', () => {
    expect(() =>
      CtoCustomer.create({
        radUsuarioId: '',
        clienteId: '5541',
        login: 'joao.silva@fibra',
        portaFtth: 1,
        razaoSocial: 'João da Silva',
        online: true,
      }),
    ).toThrow();
  });
});

describe('CtoCustomerList Domain Aggregate', () => {
  it('creates a CtoCustomerList and calculates ports correctly', () => {
    const list = CtoCustomerList.create({
      fatId: '10194',
      fatName: '11.02.04',
      totalPorts: 16,
      customers: [
        {
          radUsuarioId: '1',
          clienteId: '100',
          login: 'user1',
          portaFtth: 2,
          razaoSocial: 'Cliente 1',
          online: true,
        },
        {
          radUsuarioId: '2',
          clienteId: '200',
          login: 'user2',
          portaFtth: 1,
          razaoSocial: 'Cliente 2',
          online: false,
        },
      ],
    });

    expect(list.fatId).toBe('10194');
    expect(list.fatName).toBe('11.02.04');
    expect(list.totalPorts).toBe(16);
    expect(list.occupiedPorts).toBe(2);
    expect(list.availablePorts).toBe(14);
    // Should sort customers by port ascending
    expect(list.customers[0].portaFtth).toBe(1);
    expect(list.customers[1].portaFtth).toBe(2);

    expect(list.getCustomerByPort(1)?.login).toBe('user2');
    expect(list.getCustomerByPort(2)?.login).toBe('user1');
    expect(list.getCustomerByPort(3)).toBeUndefined();
  });

  it('throws DomainError when there are duplicate ports assigned', () => {
    expect(() =>
      CtoCustomerList.create({
        fatId: '10194',
        fatName: '11.02.04',
        totalPorts: 16,
        customers: [
          {
            radUsuarioId: '1',
            clienteId: '100',
            login: 'user1',
            portaFtth: 1,
            razaoSocial: 'Cliente 1',
            online: true,
          },
          {
            radUsuarioId: '2',
            clienteId: '200',
            login: 'user2',
            portaFtth: 1,
            razaoSocial: 'Cliente 2',
            online: true,
          },
        ],
      }),
    ).toThrow(DomainError);
  });
});
