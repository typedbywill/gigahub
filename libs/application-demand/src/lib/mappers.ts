import type { Demand, DemandQueue, Subject } from '@gigahub/domain/demand';
import type {
  DemandDto,
  DemandQueueDto,
  DemandSubjectDto,
} from '@gigahub/shared/contracts';

export function toDemandDto(demand: Demand): DemandDto {
  const snap = demand.toSnapshot();
  return {
    id: String(snap.id),
    queueId: String(snap.queueId),
    subjectId: String(snap.subjectId),
    title: snap.title,
    values: { ...snap.values },
    customerIds: snap.customerIds.map(String),
    openedByUserId: String(snap.openedByUserId),
    status: snap.status,
    assignedAgentId: snap.assignedAgentId
      ? String(snap.assignedAgentId)
      : undefined,
    openedAt: snap.openedAt.toISOString(),
    updatedAt: snap.updatedAt.toISOString(),
  };
}

export function toSubjectDto(subject: Subject): DemandSubjectDto {
  const snap = subject.toSnapshot();
  return {
    id: String(snap.id),
    name: snap.name,
    description: snap.description,
    defaultQueueId: snap.defaultQueueId
      ? String(snap.defaultQueueId)
      : undefined,
    params: snap.params.map((p) => ({
      id: p.id,
      label: p.label,
      type: p.type,
      required: p.required,
      options: p.options ? [...p.options] : undefined,
      placeholder: p.placeholder,
    })),
    isActive: snap.isActive,
    createdAt: snap.createdAt.toISOString(),
    updatedAt: snap.updatedAt.toISOString(),
  };
}

export function toDemandQueueDto(queue: DemandQueue): DemandQueueDto {
  const snap = queue.toSnapshot();
  return {
    id: String(snap.id),
    name: snap.name,
    department: snap.department,
    description: snap.description,
    isActive: snap.isActive,
    createdAt: snap.createdAt.toISOString(),
    updatedAt: snap.updatedAt.toISOString(),
  };
}
