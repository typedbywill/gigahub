import { Subject } from '@gigahub/domain/demand';
import { subjectId, type UserId, userId } from '@gigahub/shared/kernel';
import type {
  CreateSubjectInputDto,
  DemandSubjectDto,
} from '@gigahub/shared/contracts';
import {
  ApplicationError,
  ApplicationErrorCodes,
  type AccessPort,
  type SubjectRepository,
} from './ports';
import { toSubjectDto } from './mappers';

export class CreateSubjectUseCase {
  constructor(
    private readonly subjectRepo: SubjectRepository,
    private readonly access: AccessPort,
  ) {}

  async execute(
    actorUserId: UserId | string,
    input: CreateSubjectInputDto,
  ): Promise<DemandSubjectDto> {
    const actorId =
      typeof actorUserId === 'string' ? userId(actorUserId) : actorUserId;
    await this.access.assertCan(actorId, 'demand:subject:manage');

    const existing = await this.subjectRepo.findById(subjectId(input.id));
    if (existing) {
      throw new ApplicationError(
        ApplicationErrorCodes.Conflict,
        `Subject with id "${input.id}" already exists`,
        { subjectId: input.id },
      );
    }

    const subject = Subject.create({
      id: input.id,
      name: input.name,
      description: input.description,
      defaultQueueId: input.defaultQueueId,
      params: input.params,
      isActive: input.isActive ?? true,
    });

    await this.subjectRepo.save(subject);
    return toSubjectDto(subject);
  }
}
