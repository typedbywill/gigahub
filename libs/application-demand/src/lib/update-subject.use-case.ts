import { Subject } from '@gigahub/domain/demand';
import { subjectId, type UserId, userId } from '@gigahub/shared/kernel';
import type {
  DemandSubjectDto,
  UpdateSubjectInputDto,
} from '@gigahub/shared/contracts';
import {
  ApplicationError,
  ApplicationErrorCodes,
  type AccessPort,
  type SubjectRepository,
} from './ports';
import { toSubjectDto } from './mappers';

export class UpdateSubjectUseCase {
  constructor(
    private readonly subjectRepo: SubjectRepository,
    private readonly access: AccessPort,
  ) {}

  async execute(
    actorUserId: UserId | string,
    id: string,
    input: UpdateSubjectInputDto,
  ): Promise<DemandSubjectDto> {
    const actorId =
      typeof actorUserId === 'string' ? userId(actorUserId) : actorUserId;
    await this.access.assertCan(actorId, 'demand:subject:manage');

    const subject = await this.subjectRepo.findById(subjectId(id));
    if (!subject) {
      throw new ApplicationError(
        ApplicationErrorCodes.NotFound,
        `Subject "${id}" not found`,
        { subjectId: id },
      );
    }

    const currentSnapshot = subject.toSnapshot();

    const updated = Subject.create({
      id: currentSnapshot.id,
      name: input.name ?? currentSnapshot.name,
      description:
        input.description !== undefined
          ? input.description
          : currentSnapshot.description,
      defaultQueueId:
        input.defaultQueueId !== undefined
          ? input.defaultQueueId
          : currentSnapshot.defaultQueueId
            ? String(currentSnapshot.defaultQueueId)
            : undefined,
      params: input.params ?? currentSnapshot.params,
      isActive:
        input.isActive !== undefined
          ? input.isActive
          : currentSnapshot.isActive,
      createdAt: currentSnapshot.createdAt,
    });

    await this.subjectRepo.save(updated);
    return toSubjectDto(updated);
  }
}
