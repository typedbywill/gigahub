import { type UserId, userId } from '@gigahub/shared/kernel';
import type { DemandSubjectDto } from '@gigahub/shared/contracts';
import {
  type AccessPort,
  type SubjectRepository,
} from './ports';
import { toSubjectDto } from './mappers';

export class ListSubjectsUseCase {
  constructor(
    private readonly subjectRepo: SubjectRepository,
    private readonly access: AccessPort,
  ) {}

  async execute(
    actorUserId: UserId | string,
    activeOnly = false,
  ): Promise<DemandSubjectDto[]> {
    const actorId =
      typeof actorUserId === 'string' ? userId(actorUserId) : actorUserId;
    await this.access.assertCan(actorId, 'demand:read');

    const subjects = await this.subjectRepo.list(activeOnly);
    return subjects.map(toSubjectDto);
  }
}
