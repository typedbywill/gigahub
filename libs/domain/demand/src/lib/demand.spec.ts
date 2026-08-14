import { DomainError, DomainErrorCodes } from '@gigahub/shared/kernel';
import { DemandQueue } from './demand-queue';
import { Subject } from './subject';
import { Demand } from './demand';

describe('Demand and DemandQueue', () => {
  function makeQueue(
    overrides?: Partial<Parameters<typeof DemandQueue.create>[0]>,
  ) {
    return DemandQueue.create({
      id: 'queue-suporte',
      name: 'Fila — Suporte N1',
      department: 'Suporte',
      isActive: true,
      ...overrides,
    });
  }

  function makeSubject(
    overrides?: Partial<Parameters<typeof Subject.create>[0]>,
  ) {
    return Subject.create({
      id: 'sub-lentidao',
      name: 'Lentidão na navegação',
      defaultQueueId: 'queue-suporte',
      params: [
        { id: 'ip_cliente', label: 'IP do cliente', type: 'text', required: true },
        {
          id: 'tipo_lentidao',
          label: 'Tipo',
          type: 'select',
          required: true,
          options: ['Geral', 'Streaming', 'Jogos'],
        },
      ],
      isActive: true,
      ...overrides,
    });
  }

  it('opens a demand, queues it, and allows an agent to claim it', () => {
    const queue = makeQueue();
    const subject = makeSubject();

    const demand = Demand.open(
      {
        id: 'dem-1',
        queueId: queue.id,
        subjectId: subject.id,
        title: 'Cliente com lentidão em jogos',
        values: {
          ip_cliente: '192.168.1.50',
          tipo_lentidao: 'Jogos',
        },
        customerIds: ['cli-100', 'cli-200'],
        openedByUserId: 'user-creator',
      },
      subject,
      queue,
    );

    expect(demand.status).toBe('queued');
    expect(demand.assignedAgentId).toBeUndefined();
    expect(demand.customerIds).toEqual(['cli-100', 'cli-200']);

    demand.claim('agent-42');
    expect(demand.status).toBe('in_progress');
    expect(demand.assignedAgentId).toBe('agent-42');

    demand.resolve();
    expect(demand.status).toBe('resolved');

    demand.close();
    expect(demand.status).toBe('closed');
  });

  it('opens directly in_progress when assignedAgentId is provided', () => {
    const queue = makeQueue();
    const subject = makeSubject();

    const demand = Demand.open(
      {
        id: 'dem-2',
        queueId: queue.id,
        subjectId: subject.id,
        title: 'Atendimento direto',
        values: {
          ip_cliente: '10.0.0.1',
          tipo_lentidao: 'Geral',
        },
        openedByUserId: 'user-creator',
        assignedAgentId: 'agent-10',
      },
      subject,
      queue,
    );

    expect(demand.status).toBe('in_progress');
    expect(demand.assignedAgentId).toBe('agent-10');
  });

  it('rejects opening on an inactive queue or inactive subject', () => {
    const activeQueue = makeQueue();
    const inactiveQueue = makeQueue({ id: 'queue-inact', isActive: false });
    const activeSubject = makeSubject();
    const inactiveSubject = makeSubject({ id: 'sub-inact', isActive: false });

    expect(() =>
      Demand.open(
        {
          id: 'dem-3',
          queueId: inactiveQueue.id,
          subjectId: activeSubject.id,
          title: 'Teste',
          openedByUserId: 'user-1',
          values: { ip_cliente: '1.1.1.1', tipo_lentidao: 'Geral' },
        },
        activeSubject,
        inactiveQueue,
      ),
    ).toThrow(DomainError);

    expect(() =>
      Demand.open(
        {
          id: 'dem-4',
          queueId: activeQueue.id,
          subjectId: inactiveSubject.id,
          title: 'Teste',
          openedByUserId: 'user-1',
          values: { ip_cliente: '1.1.1.1', tipo_lentidao: 'Geral' },
        },
        inactiveSubject,
        activeQueue,
      ),
    ).toThrow(DomainError);
  });

  it('rejects opening if required subject params are missing or invalid', () => {
    const queue = makeQueue();
    const subject = makeSubject();

    expect(() =>
      Demand.open(
        {
          id: 'dem-5',
          queueId: queue.id,
          subjectId: subject.id,
          title: 'Sem IP',
          openedByUserId: 'user-1',
          values: { tipo_lentidao: 'Geral' }, // missing ip_cliente
        },
        subject,
        queue,
      ),
    ).toThrow(DomainError);
  });

  it('clears agent and returns to queued on transfer between queues', () => {
    const origin = makeQueue();
    const destination = makeQueue({
      id: 'queue-noc',
      name: 'Fila — NOC N2',
      department: 'NOC',
    });
    const subject = makeSubject();

    const demand = Demand.open(
      {
        id: 'dem-6',
        queueId: origin.id,
        subjectId: subject.id,
        title: 'Transferência de fila',
        openedByUserId: 'user-1',
        values: { ip_cliente: '1.1.1.1', tipo_lentidao: 'Geral' },
      },
      subject,
      origin,
    );

    demand.claim('agent-1');
    expect(demand.status).toBe('in_progress');

    demand.transferTo(destination);
    expect(demand.queueId).toBe(destination.id);
    expect(demand.status).toBe('queued');
    expect(demand.assignedAgentId).toBeUndefined();
  });

  it('rejects claim if demand is not queued', () => {
    const queue = makeQueue();
    const subject = makeSubject();

    const demand = Demand.open(
      {
        id: 'dem-7',
        queueId: queue.id,
        subjectId: subject.id,
        title: 'Claim duplicado',
        openedByUserId: 'user-1',
        values: { ip_cliente: '1.1.1.1', tipo_lentidao: 'Geral' },
      },
      subject,
      queue,
    );

    demand.claim('agent-1');
    expect(() => demand.claim('agent-2')).toThrow(DomainError);
    try {
      demand.claim('agent-2');
    } catch (err) {
      expect(err).toMatchObject({
        code: DomainErrorCodes.DemandNotAssignable,
      });
    }
  });

  it('allows updating values validated by subject', () => {
    const queue = makeQueue();
    const subject = makeSubject();

    const demand = Demand.open(
      {
        id: 'dem-8',
        queueId: queue.id,
        subjectId: subject.id,
        title: 'Atualizar valores',
        openedByUserId: 'user-1',
        values: { ip_cliente: '1.1.1.1', tipo_lentidao: 'Geral' },
      },
      subject,
      queue,
    );

    demand.updateValues(
      { ip_cliente: '10.0.0.99', tipo_lentidao: 'Streaming' },
      subject,
    );
    expect(demand.values).toEqual({
      ip_cliente: '10.0.0.99',
      tipo_lentidao: 'Streaming',
    });

    expect(() =>
      demand.updateValues(
        { ip_cliente: '', tipo_lentidao: 'Streaming' },
        subject,
      ),
    ).toThrow(DomainError);
  });
});
