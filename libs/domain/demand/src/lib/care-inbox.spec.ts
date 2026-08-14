import { DomainError, DomainErrorCodes } from '@gigahub/shared/kernel';
import { CareInbox } from './care-inbox';
import { CareTicket } from './care-ticket';

describe('CareInbox and CareTicket', () => {
  function inbox(overrides?: Partial<Parameters<typeof CareInbox.create>[0]>) {
    return CareInbox.create({
      id: 'inbox-suporte',
      name: 'Caixa de atendimento — Suporte',
      department: 'SAC',
      channel: 'whatsapp',
      isActive: true,
      ...overrides,
    });
  }

  it('opens a ticket in an active inbox and assigns an agent', () => {
    const box = inbox();
    const ticket = CareTicket.open(
      {
        id: 'atd-1',
        inboxId: box.id,
        customerId: 'cli-1',
        status: 'open',
        channel: 'whatsapp',
        externalId: 'opa-99',
      },
      box,
    );
    ticket.enqueue();
    ticket.assign('agent-7', box);
    expect(ticket.status).toBe('in_progress');
    expect(ticket.assignedAgentId).toBe('agent-7');
    ticket.resolve();
    ticket.close();
    expect(ticket.status).toBe('closed');
  });

  it('rejects tickets on an inactive inbox', () => {
    const box = inbox({ isActive: false });
    expect(() =>
      CareTicket.open(
        {
          id: 'atd-2',
          inboxId: box.id,
          status: 'open',
          channel: 'whatsapp',
        },
        box,
      ),
    ).toThrow(DomainError);
    try {
      box.assertCanAcceptTickets();
    } catch (error) {
      expect(error).toMatchObject({ code: DomainErrorCodes.InboxInactive });
    }
  });

  it('clears the agent when transferring between inboxes', () => {
    const origin = inbox();
    const destination = inbox({
      id: 'inbox-noc',
      name: 'Caixa de atendimento — NOC',
      department: 'NOC',
    });
    const ticket = CareTicket.open(
      {
        id: 'atd-3',
        inboxId: origin.id,
        status: 'open',
        channel: 'whatsapp',
      },
      origin,
    );
    ticket.assign('agent-1', origin);
    ticket.transferTo(destination);
    expect(ticket.inboxId).toBe(destination.id);
    expect(ticket.status).toBe('queued');
    expect(ticket.assignedAgentId).toBeUndefined();
  });
});
