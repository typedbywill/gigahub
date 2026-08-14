import {
  type DemandQueueId,
  type SubjectId,
  DomainError,
  DomainErrorCodes,
  assertNonEmpty,
  demandQueueId,
  subjectId,
} from '@gigahub/shared/kernel';

export const PARAM_TYPES = [
  'text',
  'longtext',
  'number',
  'date',
  'select',
  'multiselect',
  'checkbox',
  'ref:customer',
  'ref:user',
  'ref:workOrder',
  'ref:contract',
] as const;

export type ParamType = (typeof PARAM_TYPES)[number];

export interface SubjectParam {
  id: string;
  label: string;
  type: ParamType;
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export interface SubjectSnapshot {
  id: SubjectId;
  name: string;
  description?: string;
  defaultQueueId?: DemandQueueId;
  params: SubjectParam[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateSubjectInput = Omit<
  SubjectSnapshot,
  'id' | 'createdAt' | 'updatedAt' | 'defaultQueueId'
> & {
  id: string;
  defaultQueueId?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export class Subject {
  private constructor(private props: SubjectSnapshot) {}

  static create(input: CreateSubjectInput): Subject {
    const validatedParams = Subject.validateParamSchemas(input.params ?? []);
    const now = input.createdAt ?? new Date();

    return new Subject({
      id: subjectId(input.id),
      name: assertNonEmpty(input.name, 'name'),
      description: input.description?.trim() || undefined,
      defaultQueueId: input.defaultQueueId
        ? demandQueueId(input.defaultQueueId)
        : undefined,
      params: validatedParams,
      isActive: input.isActive ?? true,
      createdAt: now,
      updatedAt: input.updatedAt ?? now,
    });
  }

  static fromSnapshot(snapshot: SubjectSnapshot): Subject {
    return new Subject({
      ...snapshot,
      params: snapshot.params.map((p) => ({
        ...p,
        options: p.options ? [...p.options] : undefined,
      })),
    });
  }

  get id(): SubjectId {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get defaultQueueId(): DemandQueueId | undefined {
    return this.props.defaultQueueId;
  }

  get params(): readonly SubjectParam[] {
    return this.props.params;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  assertCanAcceptDemands(): void {
    if (!this.props.isActive) {
      throw new DomainError(
        DomainErrorCodes.SubjectInactive,
        'Subject is inactive and cannot accept demands',
        { subjectId: this.props.id },
      );
    }
  }

  addParam(param: SubjectParam): void {
    Subject.validateSingleParamSchema(param);
    if (this.props.params.some((p) => p.id === param.id)) {
      throw new DomainError(
        DomainErrorCodes.InvalidParamSchema,
        `Param with id "${param.id}" already exists`,
        { paramId: param.id },
      );
    }
    this.props.params.push({
      ...param,
      options: param.options ? [...param.options] : undefined,
    });
    this.touch();
  }

  removeParam(paramId: string): void {
    const initialLen = this.props.params.length;
    this.props.params = this.props.params.filter((p) => p.id !== paramId);
    if (this.props.params.length !== initialLen) {
      this.touch();
    }
  }

  deactivate(): void {
    this.props.isActive = false;
    this.touch();
  }

  activate(): void {
    this.props.isActive = true;
    this.touch();
  }

  validateValues(values: Record<string, unknown> = {}): void {
    for (const param of this.props.params) {
      const raw = values[param.id];
      const isMissing =
        raw === undefined ||
        raw === null ||
        raw === '' ||
        (Array.isArray(raw) && raw.length === 0);

      if (param.required && isMissing) {
        throw new DomainError(
          DomainErrorCodes.MissingRequiredParam,
          `Param "${param.label}" is required`,
          { paramId: param.id, subjectId: this.props.id },
        );
      }

      if (!isMissing) {
        this.validateSingleValue(param, raw);
      }
    }
  }

  private validateSingleValue(param: SubjectParam, value: unknown): void {
    switch (param.type) {
      case 'text':
      case 'longtext':
        if (typeof value !== 'string') {
          throw new DomainError(
            DomainErrorCodes.InvalidParamValue,
            `Param "${param.label}" must be a string`,
            { paramId: param.id, value },
          );
        }
        break;

      case 'number':
        if (
          typeof value !== 'number' ||
          Number.isNaN(value) ||
          !Number.isFinite(value)
        ) {
          throw new DomainError(
            DomainErrorCodes.InvalidParamValue,
            `Param "${param.label}" must be a valid number`,
            { paramId: param.id, value },
          );
        }
        break;

      case 'date': {
        const isDateObj = value instanceof Date && !Number.isNaN(value.getTime());
        const isDateStr =
          typeof value === 'string' &&
          value.trim().length > 0 &&
          !Number.isNaN(Date.parse(value));
        if (!isDateObj && !isDateStr) {
          throw new DomainError(
            DomainErrorCodes.InvalidParamValue,
            `Param "${param.label}" must be a valid date`,
            { paramId: param.id, value },
          );
        }
        break;
      }

      case 'checkbox':
        if (typeof value !== 'boolean') {
          throw new DomainError(
            DomainErrorCodes.InvalidParamValue,
            `Param "${param.label}" must be a boolean`,
            { paramId: param.id, value },
          );
        }
        break;

      case 'select':
        if (typeof value !== 'string' || !param.options?.includes(value)) {
          throw new DomainError(
            DomainErrorCodes.InvalidParamValue,
            `Param "${param.label}" has invalid option "${String(value)}"`,
            { paramId: param.id, value, options: param.options },
          );
        }
        break;

      case 'multiselect':
        if (
          !Array.isArray(value) ||
          !value.every(
            (v) => typeof v === 'string' && param.options?.includes(v),
          )
        ) {
          throw new DomainError(
            DomainErrorCodes.InvalidParamValue,
            `Param "${param.label}" has invalid multiselect options`,
            { paramId: param.id, value, options: param.options },
          );
        }
        break;

      case 'ref:customer':
      case 'ref:user':
      case 'ref:workOrder':
      case 'ref:contract':
        if (typeof value !== 'string' || value.trim().length === 0) {
          throw new DomainError(
            DomainErrorCodes.InvalidParamValue,
            `Param "${param.label}" must be a valid reference string`,
            { paramId: param.id, value },
          );
        }
        break;
    }
  }

  toSnapshot(): SubjectSnapshot {
    return {
      id: this.props.id,
      name: this.props.name,
      description: this.props.description,
      defaultQueueId: this.props.defaultQueueId,
      params: this.props.params.map((p) => ({
        ...p,
        options: p.options ? [...p.options] : undefined,
      })),
      isActive: this.props.isActive,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }

  private touch(): void {
    this.props.updatedAt = new Date();
  }

  private static validateParamSchemas(
    params: SubjectParam[],
  ): SubjectParam[] {
    const seenIds = new Set<string>();
    return params.map((p) => {
      Subject.validateSingleParamSchema(p);
      if (seenIds.has(p.id)) {
        throw new DomainError(
          DomainErrorCodes.InvalidParamSchema,
          `Duplicate param id "${p.id}"`,
          { paramId: p.id },
        );
      }
      seenIds.add(p.id);
      return {
        ...p,
        options: p.options ? [...p.options] : undefined,
      };
    });
  }

  private static validateSingleParamSchema(param: SubjectParam): void {
    assertNonEmpty(param.id, 'param.id');
    assertNonEmpty(param.label, 'param.label');
    if (!PARAM_TYPES.includes(param.type)) {
      throw new DomainError(
        DomainErrorCodes.InvalidParamSchema,
        `Unknown param type: ${String(param.type)}`,
        { paramType: param.type },
      );
    }
    if (param.type === 'select' || param.type === 'multiselect') {
      if (
        !Array.isArray(param.options) ||
        param.options.length === 0 ||
        param.options.some((opt) => !opt || opt.trim().length === 0)
      ) {
        throw new DomainError(
          DomainErrorCodes.InvalidParamSchema,
          `Param "${param.id}" of type ${param.type} requires at least one non-empty option`,
          { paramId: param.id },
        );
      }
    }
  }
}
