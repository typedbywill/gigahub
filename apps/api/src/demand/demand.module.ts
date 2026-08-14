import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AssignDemandUseCase,
  ClaimDemandUseCase,
  CloseDemandUseCase,
  CreateDemandQueueUseCase,
  CreateSubjectUseCase,
  GetDemandCountsUseCase,
  GetDemandUseCase,
  GetSubjectUseCase,
  ListDemandQueuesUseCase,
  ListDemandsUseCase,
  ListSubjectsUseCase,
  OpenDemandUseCase,
  ReopenDemandUseCase,
  ResolveDemandUseCase,
  TransferDemandUseCase,
  UpdateDemandValuesUseCase,
  UpdateSubjectUseCase,
} from '@gigahub/application-demand';
import { ResolveEffectiveAccess } from '@gigahub/application-identity';
import { AuthModule } from '../auth/auth.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { DemandsController } from './demands.controller';
import { SubjectsController } from './subjects.controller';
import { DemandQueuesController } from './demand-queues.controller';
import { DemandModel, DemandSchema } from './persistence/demand.schema';
import { SubjectModel, SubjectSchema } from './persistence/subject.schema';
import {
  DemandQueueModel,
  DemandQueueSchema,
} from './persistence/demand-queue.schema';
import { MongoDemandRepository } from './persistence/mongo-demand.repository';
import { MongoSubjectRepository } from './persistence/mongo-subject.repository';
import { MongoDemandQueueRepository } from './persistence/mongo-demand-queue.repository';
import { RealtimeDemandEventPublisher } from './realtime-demand-event-publisher';
import { UuidDemandIdGenerator } from './uuid-id-generator';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DemandModel.name, schema: DemandSchema },
      { name: SubjectModel.name, schema: SubjectSchema },
      { name: DemandQueueModel.name, schema: DemandQueueSchema },
    ]),
    AuthModule,
    RealtimeModule,
  ],
  controllers: [
    DemandsController,
    SubjectsController,
    DemandQueuesController,
  ],
  providers: [
    MongoDemandRepository,
    MongoSubjectRepository,
    MongoDemandQueueRepository,
    RealtimeDemandEventPublisher,
    UuidDemandIdGenerator,
    {
      provide: OpenDemandUseCase,
      useFactory: (
        demandRepo: MongoDemandRepository,
        subjectRepo: MongoSubjectRepository,
        queueRepo: MongoDemandQueueRepository,
        access: ResolveEffectiveAccess,
        eventPublisher: RealtimeDemandEventPublisher,
        idGen: UuidDemandIdGenerator,
      ) =>
        new OpenDemandUseCase(
          demandRepo,
          subjectRepo,
          queueRepo,
          access,
          eventPublisher,
          idGen,
        ),
      inject: [
        MongoDemandRepository,
        MongoSubjectRepository,
        MongoDemandQueueRepository,
        ResolveEffectiveAccess,
        RealtimeDemandEventPublisher,
        UuidDemandIdGenerator,
      ],
    },
    {
      provide: ListDemandsUseCase,
      useFactory: (
        demandRepo: MongoDemandRepository,
        access: ResolveEffectiveAccess,
      ) => new ListDemandsUseCase(demandRepo, access),
      inject: [MongoDemandRepository, ResolveEffectiveAccess],
    },
    {
      provide: GetDemandUseCase,
      useFactory: (
        demandRepo: MongoDemandRepository,
        access: ResolveEffectiveAccess,
      ) => new GetDemandUseCase(demandRepo, access),
      inject: [MongoDemandRepository, ResolveEffectiveAccess],
    },
    {
      provide: GetDemandCountsUseCase,
      useFactory: (
        demandRepo: MongoDemandRepository,
        access: ResolveEffectiveAccess,
      ) => new GetDemandCountsUseCase(demandRepo, access),
      inject: [MongoDemandRepository, ResolveEffectiveAccess],
    },
    {
      provide: ClaimDemandUseCase,
      useFactory: (
        demandRepo: MongoDemandRepository,
        access: ResolveEffectiveAccess,
        eventPublisher: RealtimeDemandEventPublisher,
      ) => new ClaimDemandUseCase(demandRepo, access, eventPublisher),
      inject: [
        MongoDemandRepository,
        ResolveEffectiveAccess,
        RealtimeDemandEventPublisher,
      ],
    },
    {
      provide: AssignDemandUseCase,
      useFactory: (
        demandRepo: MongoDemandRepository,
        access: ResolveEffectiveAccess,
        eventPublisher: RealtimeDemandEventPublisher,
      ) => new AssignDemandUseCase(demandRepo, access, eventPublisher),
      inject: [
        MongoDemandRepository,
        ResolveEffectiveAccess,
        RealtimeDemandEventPublisher,
      ],
    },
    {
      provide: TransferDemandUseCase,
      useFactory: (
        demandRepo: MongoDemandRepository,
        queueRepo: MongoDemandQueueRepository,
        access: ResolveEffectiveAccess,
        eventPublisher: RealtimeDemandEventPublisher,
      ) =>
        new TransferDemandUseCase(
          demandRepo,
          queueRepo,
          access,
          eventPublisher,
        ),
      inject: [
        MongoDemandRepository,
        MongoDemandQueueRepository,
        ResolveEffectiveAccess,
        RealtimeDemandEventPublisher,
      ],
    },
    {
      provide: ResolveDemandUseCase,
      useFactory: (
        demandRepo: MongoDemandRepository,
        access: ResolveEffectiveAccess,
        eventPublisher: RealtimeDemandEventPublisher,
      ) => new ResolveDemandUseCase(demandRepo, access, eventPublisher),
      inject: [
        MongoDemandRepository,
        ResolveEffectiveAccess,
        RealtimeDemandEventPublisher,
      ],
    },
    {
      provide: CloseDemandUseCase,
      useFactory: (
        demandRepo: MongoDemandRepository,
        access: ResolveEffectiveAccess,
        eventPublisher: RealtimeDemandEventPublisher,
      ) => new CloseDemandUseCase(demandRepo, access, eventPublisher),
      inject: [
        MongoDemandRepository,
        ResolveEffectiveAccess,
        RealtimeDemandEventPublisher,
      ],
    },
    {
      provide: ReopenDemandUseCase,
      useFactory: (
        demandRepo: MongoDemandRepository,
        access: ResolveEffectiveAccess,
        eventPublisher: RealtimeDemandEventPublisher,
      ) => new ReopenDemandUseCase(demandRepo, access, eventPublisher),
      inject: [
        MongoDemandRepository,
        ResolveEffectiveAccess,
        RealtimeDemandEventPublisher,
      ],
    },
    {
      provide: UpdateDemandValuesUseCase,
      useFactory: (
        demandRepo: MongoDemandRepository,
        subjectRepo: MongoSubjectRepository,
        access: ResolveEffectiveAccess,
        eventPublisher: RealtimeDemandEventPublisher,
      ) =>
        new UpdateDemandValuesUseCase(
          demandRepo,
          subjectRepo,
          access,
          eventPublisher,
        ),
      inject: [
        MongoDemandRepository,
        MongoSubjectRepository,
        ResolveEffectiveAccess,
        RealtimeDemandEventPublisher,
      ],
    },
    {
      provide: ListSubjectsUseCase,
      useFactory: (
        subjectRepo: MongoSubjectRepository,
        access: ResolveEffectiveAccess,
      ) => new ListSubjectsUseCase(subjectRepo, access),
      inject: [MongoSubjectRepository, ResolveEffectiveAccess],
    },
    {
      provide: GetSubjectUseCase,
      useFactory: (
        subjectRepo: MongoSubjectRepository,
        access: ResolveEffectiveAccess,
      ) => new GetSubjectUseCase(subjectRepo, access),
      inject: [MongoSubjectRepository, ResolveEffectiveAccess],
    },
    {
      provide: CreateSubjectUseCase,
      useFactory: (
        subjectRepo: MongoSubjectRepository,
        access: ResolveEffectiveAccess,
      ) => new CreateSubjectUseCase(subjectRepo, access),
      inject: [MongoSubjectRepository, ResolveEffectiveAccess],
    },
    {
      provide: UpdateSubjectUseCase,
      useFactory: (
        subjectRepo: MongoSubjectRepository,
        access: ResolveEffectiveAccess,
      ) => new UpdateSubjectUseCase(subjectRepo, access),
      inject: [MongoSubjectRepository, ResolveEffectiveAccess],
    },
    {
      provide: ListDemandQueuesUseCase,
      useFactory: (
        queueRepo: MongoDemandQueueRepository,
        access: ResolveEffectiveAccess,
      ) => new ListDemandQueuesUseCase(queueRepo, access),
      inject: [MongoDemandQueueRepository, ResolveEffectiveAccess],
    },
    {
      provide: CreateDemandQueueUseCase,
      useFactory: (
        queueRepo: MongoDemandQueueRepository,
        access: ResolveEffectiveAccess,
      ) => new CreateDemandQueueUseCase(queueRepo, access),
      inject: [MongoDemandQueueRepository, ResolveEffectiveAccess],
    },
  ],
})
export class DemandModule {}
