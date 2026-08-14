import { subjectId, type UserId, userId } from '@gigahub/shared/kernel';
import type { DemandSubjectDto } from '@gigahub/shared/contracts';
import {
  ApplicationError,
  ApplicationErrorCodes,
  type AccessPort,
  type SubjectRepository,
} from './ports';
import { toSubjectDto } from './mappers';

export class GetSubjectUseCase {
  constructor(
    private readonly subjectRepo: SubjectRepository,
    private readonly access: AccessPort,
  ) {}

  async execute(
    actorUserId: UserId | string,
    id: string,
  ): Promise<DemandSubjectDto> {
    const actorId =
      typeof actorUserId === 'string' ? userId(actorUserId) : actorUserId;
    await this.access.assertCan(actorId, 'demand:read');

    const subject = await this.subjectRepo.findById(subjectId(id));
    if (!subject) {
      throw new ApplicationError(
        ApplicationErrorCodes.NotFound,
        `Subject "${id}" not found`,
        { subjectId: id },
      );
    }

    return toSubjectDto(subject);
  }
}
