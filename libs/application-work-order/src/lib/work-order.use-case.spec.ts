import { DomainError } from '@gigahub/shared/kernel';
import {
  type ActorUser,
  type WorkOrderCommandRepository,
  type WorkOrderQueryRepository,
  type AccessPort,
  type UserLookupPort,
  ApplicationError,
} from './ports';
import { GetMyScheduleUseCase } from './get-my-schedule.use-case';
import { StartWorkOrderDisplacementUseCase } from './start-work-order-displacement.use-case';
import { StartWorkOrderExecutionUseCase } from './start-work-order-execution.use-case';
import { CompleteWorkOrderUseCase } from './complete-work-order.use-case';
import { RescheduleWorkOrderUseCase } from './reschedule-work-order.use-case';
import { AddWorkOrderMessageUseCase } from './add-work-order-message.use-case';
import type { WorkOrderDetailDto, WorkOrderSummaryDto } from '@gigahub/shared/contracts';

describe('Application Work Order Use Cases', () => {
  const mockActor: ActorUser = {
    userId: 'user-1',
    idErp: '10',
    idErpEmployee: '25',
    name: 'Técnico Silva',
    email: 'silva@giganet.com.br',
  };

  const sampleSummary: WorkOrderSummaryDto = {
    id: 'os-100',
    idErp: '5001',
    status: 'AG',
    customerId: 'cli-1',
    customerName: 'João da Silva',
    customerPhone: '31999998888',
    customerAddress: 'Rua das Flores, 123',
    subjectId: 'sub-1',
    subjectName: 'Instalação FTTH',
    technicianId: 'user-1',
    technicianName: 'Técnico Silva',
    scheduledAt: '2026-08-14T09:00:00Z',
    createdAt: '2026-08-14T08:00:00Z',
    updatedAt: '2026-08-14T08:00:00Z',
  };

  const sampleDetail: WorkOrderDetailDto = {
    ...sampleSummary,
    description: 'Instalação nova de fibra',
    messages: [],
    files: [],
    location: {
      latitude: -23.55052,
      longitude: -46.633308,
    },
  };

  let queryRepo: jest.Mocked<WorkOrderQueryRepository>;
  let commandRepo: jest.Mocked<WorkOrderCommandRepository>;
  let userLookup: jest.Mocked<UserLookupPort>;
  let accessPort: jest.Mocked<AccessPort>;

  beforeEach(() => {
    queryRepo = {
      getMySchedule: jest.fn().mockResolvedValue([sampleSummary]),
      listActive: jest.fn().mockResolvedValue([sampleSummary]),
      list: jest.fn().mockResolvedValue({
        items: [sampleSummary],
        total: 1,
        page: 1,
        limit: 20,
        pages: 1,
      }),
      findById: jest.fn().mockResolvedValue(sampleDetail),
      listByCustomer: jest.fn().mockResolvedValue([sampleSummary]),
    };

    commandRepo = {
      startDisplacement: jest.fn().mockResolvedValue(undefined),
      startExecution: jest.fn().mockResolvedValue(undefined),
      reschedule: jest.fn().mockResolvedValue(undefined),
      complete: jest.fn().mockResolvedValue(undefined),
      addMessage: jest.fn().mockResolvedValue(undefined),
    };

    userLookup = {
      findActorUser: jest.fn().mockResolvedValue(mockActor),
    };

    accessPort = {
      assertCan: jest.fn().mockResolvedValue(undefined),
    };
  });

  describe('GetMyScheduleUseCase', () => {
    it('returns technician schedule when authorized', async () => {
      const useCase = new GetMyScheduleUseCase(queryRepo, userLookup, accessPort);
      const result = await useCase.execute({
        actorUserId: 'user-1',
        query: { date: '2026-08-14' },
      });

      expect(accessPort.assertCan).toHaveBeenCalledWith('user-1', 'work-order:read');
      expect(result).toEqual([sampleSummary]);
      expect(queryRepo.getMySchedule).toHaveBeenCalledWith(mockActor, { date: '2026-08-14' });
    });
  });

  describe('StartWorkOrderDisplacementUseCase', () => {
    it('transitions AG to DS successfully', async () => {
      const useCase = new StartWorkOrderDisplacementUseCase(
        queryRepo,
        commandRepo,
        userLookup,
        accessPort,
      );

      const result = await useCase.execute({
        actorUserId: 'user-1',
        workOrderId: 'os-100',
        body: {
          location: { latitude: -23.55, longitude: -46.63 },
        },
      });

      expect(result).toEqual({ success: true, status: 'DS' });
      expect(commandRepo.startDisplacement).toHaveBeenCalledWith(
        '5001',
        mockActor,
        expect.objectContaining({ latitude: -23.55, longitude: -46.63 }),
      );
    });

    it('rejects if work order not found', async () => {
      queryRepo.findById.mockResolvedValueOnce(null);
      const useCase = new StartWorkOrderDisplacementUseCase(
        queryRepo,
        commandRepo,
        userLookup,
        accessPort,
      );

      await expect(
        useCase.execute({
          actorUserId: 'user-1',
          workOrderId: 'os-999',
          body: {},
        }),
      ).rejects.toThrow(ApplicationError);
    });
  });

  describe('StartWorkOrderExecutionUseCase', () => {
    it('transitions DS to EX with valid reason (>= 11 chars) and estimated duration', async () => {
      queryRepo.findById.mockResolvedValueOnce({
        ...sampleDetail,
        status: 'DS',
      });

      const useCase = new StartWorkOrderExecutionUseCase(
        queryRepo,
        commandRepo,
        userLookup,
        accessPort,
      );

      const result = await useCase.execute({
        actorUserId: 'user-1',
        workOrderId: 'os-100',
        body: {
          estimatedDurationMinutes: 45,
          reason: 'Iniciando passagem de fibra no poste',
        },
      });

      expect(result).toEqual({ success: true, status: 'EX' });
      expect(commandRepo.startExecution).toHaveBeenCalledWith(
        '5001',
        expect.objectContaining({
          technician: mockActor,
          estimatedDurationMinutes: 45,
          reason: 'Iniciando passagem de fibra no poste',
        }),
      );
    });

    it('rejects execution when reason is too short (< 11 chars)', async () => {
      queryRepo.findById.mockResolvedValueOnce({
        ...sampleDetail,
        status: 'DS',
      });

      const useCase = new StartWorkOrderExecutionUseCase(
        queryRepo,
        commandRepo,
        userLookup,
        accessPort,
      );

      await expect(
        useCase.execute({
          actorUserId: 'user-1',
          workOrderId: 'os-100',
          body: {
            estimatedDurationMinutes: 30,
            reason: 'Curto',
          },
        }),
      ).rejects.toThrow(DomainError);
    });
  });

  describe('CompleteWorkOrderUseCase', () => {
    it('completes work order when within 300m geofence', async () => {
      queryRepo.findById.mockResolvedValueOnce({
        ...sampleDetail,
        status: 'EX',
      });

      const useCase = new CompleteWorkOrderUseCase(
        queryRepo,
        commandRepo,
        userLookup,
        accessPort,
      );

      const result = await useCase.execute({
        actorUserId: 'user-1',
        workOrderId: 'os-100',
        body: {
          location: {
            latitude: -23.55052,
            longitude: -46.633308,
          },
        },
      });

      expect(result).toEqual({ success: true, status: 'F' });
      expect(commandRepo.complete).toHaveBeenCalled();
    });

    it('rejects completion when outside geofence radius', async () => {
      queryRepo.findById.mockResolvedValueOnce({
        ...sampleDetail,
        status: 'EX',
      });

      const useCase = new CompleteWorkOrderUseCase(
        queryRepo,
        commandRepo,
        userLookup,
        accessPort,
      );

      await expect(
        useCase.execute({
          actorUserId: 'user-1',
          workOrderId: 'os-100',
          body: {
            location: {
              latitude: -23.60,
              longitude: -46.70,
            },
          },
        }),
      ).rejects.toThrow(DomainError);
    });
  });

  describe('RescheduleWorkOrderUseCase', () => {
    it('reschedules work order', async () => {
      const useCase = new RescheduleWorkOrderUseCase(
        queryRepo,
        commandRepo,
        userLookup,
        accessPort,
      );

      const result = await useCase.execute({
        actorUserId: 'user-1',
        workOrderId: 'os-100',
        body: {
          newDate: '2026-08-15 14:00:00',
          reason: 'Cliente não estava em casa',
        },
      });

      expect(result).toEqual({ success: true, status: 'RAG' });
      expect(commandRepo.reschedule).toHaveBeenCalledWith('5001', {
        technician: mockActor,
        newDate: '2026-08-15 14:00:00',
        reason: 'Cliente não estava em casa',
      });
    });
  });

  describe('AddWorkOrderMessageUseCase', () => {
    it('adds message to work order timeline in IXC', async () => {
      const useCase = new AddWorkOrderMessageUseCase(
        queryRepo,
        commandRepo,
        userLookup,
        accessPort,
      );

      const result = await useCase.execute({
        actorUserId: 'user-1',
        workOrderId: 'os-100',
        body: {
          message: 'Passagem de drop concluída, aguardando conectorização',
        },
      });

      expect(result).toEqual({ success: true });
      expect(commandRepo.addMessage).toHaveBeenCalledWith('5001', {
        authorName: mockActor.name,
        message: 'Passagem de drop concluída, aguardando conectorização',
      });
    });
  });
});
