import {
  type SubjectId,
  DomainError,
  DomainErrorCodes,
  assertNonEmpty,
  subjectId,
} from '@gigahub/shared/kernel';

export const SUBJECT_QUESTION_TYPES = ['string', 'number', 'options'] as const;
export type SubjectQuestionType = (typeof SUBJECT_QUESTION_TYPES)[number];

export interface SubjectFileRequirement {
  name: string;
  requiredOnExecution: boolean;
}

export interface SubjectQuestion {
  id: string;
  prompt: string;
  type: SubjectQuestionType;
  required: boolean;
}

export interface SubjectSnapshot {
  id: SubjectId;
  name: string;
  ixcSubjectIds: string[];
  defaultMinutes: number;
  nocReviews: boolean;
  files: SubjectFileRequirement[];
  closingQuestions: SubjectQuestion[];
}

export type CreateSubjectInput = Omit<SubjectSnapshot, 'id'> & { id: string };

export class Subject {
  private constructor(private readonly props: SubjectSnapshot) {}

  static create(input: CreateSubjectInput): Subject {
    if (input.defaultMinutes <= 0) {
      throw new DomainError(
        DomainErrorCodes.InvariantViolation,
        'Subject defaultMinutes must be greater than 0',
      );
    }
    return new Subject({
      ...input,
      id: subjectId(input.id),
      name: assertNonEmpty(input.name, 'name'),
      ixcSubjectIds: [...input.ixcSubjectIds],
      files: input.files.map((file) => ({ ...file })),
      closingQuestions: input.closingQuestions.map((question) => ({
        ...question,
      })),
    });
  }

  static fromSnapshot(snapshot: SubjectSnapshot): Subject {
    return new Subject({
      ...snapshot,
      ixcSubjectIds: [...snapshot.ixcSubjectIds],
      files: snapshot.files.map((file) => ({ ...file })),
      closingQuestions: snapshot.closingQuestions.map((question) => ({
        ...question,
      })),
    });
  }

  get id(): SubjectId {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get nocReviews(): boolean {
    return this.props.nocReviews;
  }

  filesRequiredOnExecution(): SubjectFileRequirement[] {
    return this.props.files.filter((file) => file.requiredOnExecution);
  }

  toSnapshot(): SubjectSnapshot {
    return {
      ...this.props,
      ixcSubjectIds: [...this.props.ixcSubjectIds],
      files: this.props.files.map((file) => ({ ...file })),
      closingQuestions: this.props.closingQuestions.map((question) => ({
        ...question,
      })),
    };
  }
}
