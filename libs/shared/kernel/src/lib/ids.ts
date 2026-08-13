import { Brand, assertNonEmpty } from './brand';
import { DomainError, DomainErrorCodes } from './domain-error';

function brandedId<B extends string>(
  value: string,
  brand: B,
): Brand<string, B> {
  try {
    return assertNonEmpty(value, brand) as Brand<string, B>;
  } catch {
    throw new DomainError(
      DomainErrorCodes.InvalidId,
      `${brand} cannot be empty`,
    );
  }
}

export type CustomerId = Brand<string, 'CustomerId'>;
export type ContractId = Brand<string, 'ContractId'>;
export type EmployeeId = Brand<string, 'EmployeeId'>;
export type WorkOrderId = Brand<string, 'WorkOrderId'>;
export type SubjectId = Brand<string, 'SubjectId'>;
export type CareInboxId = Brand<string, 'CareInboxId'>;
export type CareTicketId = Brand<string, 'CareTicketId'>;
export type FiberAccessTerminalId = Brand<string, 'FiberAccessTerminalId'>;

export const customerId = (value: string): CustomerId =>
  brandedId(value, 'CustomerId');
export const contractId = (value: string): ContractId =>
  brandedId(value, 'ContractId');
export const employeeId = (value: string): EmployeeId =>
  brandedId(value, 'EmployeeId');
export const workOrderId = (value: string): WorkOrderId =>
  brandedId(value, 'WorkOrderId');
export const subjectId = (value: string): SubjectId =>
  brandedId(value, 'SubjectId');
export const careInboxId = (value: string): CareInboxId =>
  brandedId(value, 'CareInboxId');
export const careTicketId = (value: string): CareTicketId =>
  brandedId(value, 'CareTicketId');
export const fiberAccessTerminalId = (
  value: string,
): FiberAccessTerminalId => brandedId(value, 'FiberAccessTerminalId');
