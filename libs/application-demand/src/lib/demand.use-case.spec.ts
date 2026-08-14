import { Demand, DemandQueue, Subject } from '@gigahub/domain/demand';
import type {
  DemandId,
  DemandQueueId,
  SubjectId,
  UserId,
} from '@gigahub/shared/kernel';
import type {
  AccessPort,
  DemandCountsResult,
  DemandListQuery,
  DemandListResult,
  DemandQueueRepository,
  DemandRepository,
  EventPublisherPort,
  IdGeneratorPort,
  SubjectRepository,
} from './ports';
import { OpenDemandUseCase } from './open-demand.use-case';
import { ClaimDemandUseCase } from './claim-demand.use-case';
import { TransferDemandUseCase } from './transfer-demand.use-case';
import { ResolveDemandUseCase } from './resolve-demand.use-case';
import { CloseDemandUseCase } from './close-demand.use-case';
import { ListDemandsUseCase } from './list-demands.use-case';
import { CreateSubjectUseCase } from './create-subject.use-case';

class InMemoryDemandRepo implements DemandRepository {
  private demands = new Map<string, Demand>();

  async findById(id: DemandId): Promise<Demand | null> {
    const d = this.demands.get(String(id));
    return d ? Demand.fromSnapshot(d.toSnapshot()) : null;
  }

  async list(query: DemandListQuery): Promise<DemandListResult> {
    let items = Array.from(this.demands.values());
    if (query.view === 'mine') {
      items = items.filter(
        (d) => String(d.assignedAgentId) === String(query.actorUserId),
      );
    } else if (query.view === 'queue') {
      items = items.filter((d) => d.status === 'queued');
    } else if (query.view === 'claimed') {
      items = items.filter(
        (d) =>
          String(d.assignedAgentId) === String(query.actorUserId) &&
          (d.status === 'in_progress' || d.status === 'waiting'),
      );
    }
    if (query.status) {
      items = items.filter((d) => d.status === query.status);
    }
    if (query.subjectId) {
      items = items.filter((d) => String(d.subjectId) === query.subjectId);
    }
    if (query.queueId) {
      items = items.filter((d) => String(d.queueId) === query.queueId);
    }
    return { items, total: items.length };
  }

  async countByViews(actorUserId: UserId): Promise<DemandCountsResult> {
    const all = Array.from(this.demands.values());
    return {
      inbox: all.filter(
        (d) => String(d.assignedAgentId) === String(actorUserId),
      ).length,
      queue: all.filter((d) => d.status === 'queued').length,
      claimed: all.filter(
        (d) =>
          String(d.assignedAgentId) === String(actorUserId) &&
          (d.status === 'in_progress' || d.status === 'waiting'),
      ).length,
      all: all.length,
    };
  }

  async save(demand: Demand): Promise<void> {
    this.demands.set(String(demand.id), Demand.fromSnapshot(demand.toSnapshot()));
  }
}

class InMemorySubjectRepo implements SubjectRepository {
  private subjects = new Map<string, Subject>();

  async findById(id: SubjectId): Promise<Subject | null> {
    const s = this.subjects.get(String(id));
    return s ? Subject.fromSnapshot(s.toSnapshot()) : null;
  }

  async list(activeOnly?: boolean): Promise<Subject[]> {
    let list = Array.from(this.subjects.values());
    if (activeOnly) {
      list = list.filter((s) => s.isActive);
    }
    return list;
  }

  async save(subject: Subject): Promise<void> {
    this.subjects.set(
      String(subject.id),
      Subject.fromSnapshot(subject.toSnapshot()),
    );
  }
}

class InMemoryQueueRepo implements DemandQueueRepository {
  private queues = new Map<string, DemandQueue>();

  async findById(id: DemandQueueId): Promise<DemandQueue | null> {
    const q = this.queues.get(String(id));
    return q ? DemandQueue.fromSnapshot(q.toSnapshot()) : null;
  }

  async list(activeOnly?: boolean): Promise<DemandQueue[]> {
    let list = Array.from(this.queues.values());
    if (activeOnly) {
      list = list.filter((q) => q.isActive);
    }
    return list;
  }

  async save(queue: DemandQueue): Promise<void> {
    this.queues.set(
      String(queue.id),
      DemandQueue.fromSnapshot(queue.toSnapshot()),
    );
  }
}

class AllowAllAccess implements AccessPort {
  async assertCan(): Promise<void> {
    return Promise.resolve();
  }
}

class MockEventPublisher implements EventPublisherPort {
  events: Array<{ eventType: string; payload: unknown }> = [];
  async publish<T>(eventType: string, payload: T): Promise<void> {
    this.events.push({ eventType, payload });
  }
}

class SequentialIdGen implements IdGeneratorPort {
  private seq = 0;
  generate(): string {
    this.seq += 1;
    return `dmd-${this.seq}`;
  }
}

describe('Demand application use cases', () => {
  let demandRepo: InMemoryDemandRepo;
  let subjectRepo: InMemorySubjectRepo;
  let queueRepo: InMemoryQueueRepo;
  let access: AllowAllAccess;
  let eventPublisher: MockEventPublisher;
  let idGen: SequentialIdGen;

  beforeEach(async () => {
    demandRepo = new InMemoryDemandRepo();
    subjectRepo = new InMemorySubjectRepo();
    queueRepo = new InMemoryQueueRepo();
    access = new AllowAllAccess();
    eventPublisher = new MockEventPublisher();
    idGen = new SequentialIdGen();

    await queueRepo.save(
      DemandQueue.create({
        id: 'queue-n1',
        name: 'Suporte N1',
        isActive: true,
      }),
    );
    await queueRepo.save(
      DemandQueue.create({
        id: 'queue-n2',
        name: 'NOC N2',
        isActive: true,
      }),
    );
    await subjectRepo.save(
      Subject.create({
        id: 'sub-troca-plano',
        name: 'Troca de Plano',
        defaultQueueId: 'queue-n1',
        params: [
          { id: 'novo_plano', label: 'Novo Plano', type: 'text', required: true },
        ],
        isActive: true,
      }),
    );
  });

  it('runs the full lifecycle: open -> list queue -> claim -> resolve -> close', async () => {
    const openUseCase = new OpenDemandUseCase(
      demandRepo,
      subjectRepo,
      queueRepo,
      access,
      eventPublisher,
      idGen,
    );
    const listUseCase = new ListDemandsUseCase(demandRepo, access);
    const claimUseCase = new ClaimDemandUseCase(demandRepo, access, eventPublisher);
    const resolveUseCase = new ResolveDemandUseCase(
      demandRepo,
      access,
      eventPublisher,
    );
    const closeUseCase = new CloseDemandUseCase(
      demandRepo,
      access,
      eventPublisher,
    );

    // 1. Open
    const opened = await openUseCase.execute('user-creator', {
      subjectId: 'sub-troca-plano',
      title: 'Cliente quer upgrade para 600MB',
      values: { novo_plano: '600MB Fibra' },
      customerIds: ['cli-1'],
    });

    expect(opened.id).toBe('dmd-1');
    expect(opened.status).toBe('queued');
    expect(opened.values['novo_plano']).toBe('600MB Fibra');

    // 2. List queue
    const queuedList = await listUseCase.execute('agent-1', { view: 'queue' });
    expect(queuedList.items).toHaveLength(1);
    expect(queuedList.items[0].id).toBe('dmd-1');

    // 3. Claim
    const claimed = await claimUseCase.execute('agent-1', 'dmd-1');
    expect(claimed.status).toBe('in_progress');
    expect(claimed.assignedAgentId).toBe('agent-1');

    // 4. Resolve & Close
    const resolved = await resolveUseCase.execute('agent-1', 'dmd-1');
    expect(resolved.status).toBe('resolved');

    const closed = await closeUseCase.execute('agent-1', 'dmd-1');
    expect(closed.status).toBe('closed');
  });

  it('transfers a demand to another queue', async () => {
    const openUseCase = new OpenDemandUseCase(
      demandRepo,
      subjectRepo,
      queueRepo,
      access,
      eventPublisher,
      idGen,
    );
    const transferUseCase = new TransferDemandUseCase(
      demandRepo,
      queueRepo,
      access,
      eventPublisher,
    );

    await openUseCase.execute('user-1', {
      subjectId: 'sub-troca-plano',
      title: 'Problema de rota',
      values: { novo_plano: 'Nenhum' },
    });

    const transferred = await transferUseCase.execute('user-1', 'dmd-1', {
      queueId: 'queue-n2',
    });

    expect(transferred.queueId).toBe('queue-n2');
    expect(transferred.status).toBe('queued');
  });

  it('creates a subject via CreateSubjectUseCase', async () => {
    const createSubUseCase = new CreateSubjectUseCase(subjectRepo, access);
    const created = await createSubUseCase.execute('admin-1', {
      id: 'sub-financeiro',
      name: 'Negociação de Débito',
      defaultQueueId: 'queue-n1',
      params: [
        { id: 'valor', label: 'Valor', type: 'number', required: true },
      ],
      isActive: true,
    });

    expect(created.id).toBe('sub-financeiro');
    expect(created.params).toHaveLength(1);
  });
});
