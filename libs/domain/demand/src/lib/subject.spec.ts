import { DomainError, DomainErrorCodes } from '@gigahub/shared/kernel';
import { Subject } from './subject';

describe('Subject entity', () => {
  it('creates a subject with valid params', () => {
    const sub = Subject.create({
      id: 'sub-fin',
      name: 'Alteração de Vencimento',
      description: 'Solicitação de troca de data de vencimento',
      defaultQueueId: 'queue-fin',
      params: [
        {
          id: 'motivo',
          label: 'Motivo',
          type: 'text',
          required: true,
        },
        {
          id: 'novo_dia',
          label: 'Novo dia de vencimento',
          type: 'select',
          required: true,
          options: ['05', '10', '15', '20', '25'],
        },
        {
          id: 'cliente_ref',
          label: 'Cliente',
          type: 'ref:customer',
          required: true,
        },
        {
          id: 'observacoes',
          label: 'Observações adicionais',
          type: 'longtext',
          required: false,
        },
      ],
      isActive: true,
    });

    expect(sub.id).toBe('sub-fin');
    expect(sub.name).toBe('Alteração de Vencimento');
    expect(sub.params).toHaveLength(4);
    expect(sub.isActive).toBe(true);
  });

  it('rejects duplicate param ids', () => {
    expect(() =>
      Subject.create({
        id: 'sub-dup',
        name: 'Duplicado',
        params: [
          { id: 'campo1', label: 'Campo 1', type: 'text', required: true },
          { id: 'campo1', label: 'Campo 1 bis', type: 'text', required: false },
        ],
        isActive: true,
      }),
    ).toThrow(DomainError);
  });

  it('rejects select and multiselect without options', () => {
    expect(() =>
      Subject.create({
        id: 'sub-sel',
        name: 'Select sem opções',
        params: [
          { id: 'opcao', label: 'Opção', type: 'select', required: true },
        ],
        isActive: true,
      }),
    ).toThrow(DomainError);

    expect(() =>
      Subject.create({
        id: 'sub-multi',
        name: 'Multi sem opções',
        params: [
          {
            id: 'opcoes',
            label: 'Opções',
            type: 'multiselect',
            required: true,
            options: [],
          },
        ],
        isActive: true,
      }),
    ).toThrow(DomainError);
  });

  it('validates required and typed values correctly', () => {
    const sub = Subject.create({
      id: 'sub-val',
      name: 'Validação',
      params: [
        { id: 'txt', label: 'Texto', type: 'text', required: true },
        { id: 'num', label: 'Número', type: 'number', required: true },
        { id: 'dt', label: 'Data', type: 'date', required: true },
        { id: 'chk', label: 'Aceite', type: 'checkbox', required: true },
        {
          id: 'sel',
          label: 'Opção',
          type: 'select',
          required: true,
          options: ['A', 'B'],
        },
        {
          id: 'multi',
          label: 'Multi',
          type: 'multiselect',
          required: false,
          options: ['X', 'Y', 'Z'],
        },
        { id: 'usr', label: 'Usuário', type: 'ref:user', required: false },
      ],
      isActive: true,
    });

    // Valid values
    expect(() =>
      sub.validateValues({
        txt: 'Olá',
        num: 42,
        dt: '2026-08-14',
        chk: true,
        sel: 'A',
        multi: ['X', 'Z'],
        usr: 'user-123',
      }),
    ).not.toThrow();

    // Missing required field
    expect(() =>
      sub.validateValues({
        txt: '',
        num: 42,
        dt: '2026-08-14',
        chk: true,
        sel: 'A',
      }),
    ).toThrow(DomainError);

    // Invalid select option
    expect(() =>
      sub.validateValues({
        txt: 'Ok',
        num: 42,
        dt: '2026-08-14',
        chk: true,
        sel: 'INVALID_OPTION',
      }),
    ).toThrow(DomainError);

    // Invalid number
    expect(() =>
      sub.validateValues({
        txt: 'Ok',
        num: 'not a number' as unknown as number,
        dt: '2026-08-14',
        chk: true,
        sel: 'A',
      }),
    ).toThrow(DomainError);
  });

  it('enforces active state for accepting demands', () => {
    const sub = Subject.create({
      id: 'sub-inact',
      name: 'Inativo',
      params: [],
      isActive: false,
    });

    expect(() => sub.assertCanAcceptDemands()).toThrow(DomainError);
    try {
      sub.assertCanAcceptDemands();
    } catch (err) {
      expect(err).toMatchObject({ code: DomainErrorCodes.SubjectInactive });
    }

    sub.activate();
    expect(() => sub.assertCanAcceptDemands()).not.toThrow();
  });

  it('adds and removes params dynamically', () => {
    const sub = Subject.create({
      id: 'sub-dyn',
      name: 'Dinâmico',
      params: [{ id: 'p1', label: 'P1', type: 'text', required: true }],
      isActive: true,
    });

    sub.addParam({ id: 'p2', label: 'P2', type: 'number', required: false });
    expect(sub.params).toHaveLength(2);

    sub.removeParam('p1');
    expect(sub.params).toHaveLength(1);
    expect(sub.params[0].id).toBe('p2');
  });
});
