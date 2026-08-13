import {
  DomainError,
  DomainErrorCodes,
  geoPoint,
} from '@gigahub/shared/kernel';
import { WorkOrder } from './work-order';
import { GEOFENCE_RADIUS_METERS } from './work-order-status';

describe('WorkOrder', () => {
  const location = geoPoint(-23.55052, -46.633308);

  function scheduled() {
    return WorkOrder.create({
      id: 'os-1',
      idErp: '9001',
      status: 'AG',
      customerId: 'cli-1',
      technicianId: 'tec-1',
      location,
    });
  }

  it('follows AG → DS → EX and requests completion inside the geofence', () => {
    const order = scheduled();
    order.startDisplacement();
    expect(order.status).toBe('DS');

    order.startExecution({
      estimatedDurationMinutes: 40,
      reason: 'Troca de ONU no local',
    });
    expect(order.status).toBe('EX');

    order.requestCompletion(location);
    expect(order.completionRequestedAt).toBeInstanceOf(Date);

    order.completeFromReview();
    expect(order.status).toBe('F');
  });

  it('rejects execution without a long enough reason', () => {
    const order = scheduled();
    order.startDisplacement();
    expect(() =>
      order.startExecution({ estimatedDurationMinutes: 10, reason: 'curto' }),
    ).toThrow(DomainError);
  });

  it('rejects completion outside the 300 m geofence', () => {
    const order = scheduled();
    order.startDisplacement();
    order.startExecution({
      estimatedDurationMinutes: 20,
      reason: 'Atendimento no endereço do cliente',
    });
    const far = geoPoint(-23.56, -46.633308);
    expect(order.isWithinGeofence(far, GEOFENCE_RADIUS_METERS)).toBe(false);
    expect(() => order.requestCompletion(far)).toThrow(DomainError);
    try {
      order.requestCompletion(far);
    } catch (error) {
      expect(error).toMatchObject({
        code: DomainErrorCodes.InvariantViolation,
      });
    }
  });

  it('rejects an illegal status jump', () => {
    const order = scheduled();
    expect(() => order.completeFromReview()).toThrow(DomainError);
    try {
      order.startExecution({
        estimatedDurationMinutes: 10,
        reason: 'Motivo suficientemente longo',
      });
    } catch (error) {
      expect(error).toMatchObject({
        code: DomainErrorCodes.InvalidStatusTransition,
      });
    }
  });
});
