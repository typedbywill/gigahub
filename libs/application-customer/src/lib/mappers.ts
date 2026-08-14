import type { Customer } from '@gigahub/domain/customer';
import type {
  CustomerConsultationResponseDto,
  CustomerConsultSection,
  CustomerDto,
} from '@gigahub/shared/contracts';
import type {
  CustomerComodatoReadModel,
  CustomerContractReadModel,
  CustomerFaturaReadModel,
  CustomerFibraHistoricoReadModel,
  CustomerFibraReadModel,
  CustomerLoginReadModel,
  CustomerSearchHitReadModel,
  PaginatedReadModel,
} from './ports';

function toIso(date: Date | undefined): string | undefined {
  return date?.toISOString();
}

export function toCustomerDto(customer: Customer): CustomerDto {
  const snapshot = customer.toSnapshot();
  return {
    id: String(snapshot.id),
    idErp: snapshot.idErp,
    name: snapshot.name,
    document: snapshot.document,
    email: snapshot.email,
    phone: snapshot.phone,
    status: snapshot.status,
    address: snapshot.address
      ? {
          street: snapshot.address.street,
          number: snapshot.address.number,
          neighborhood: snapshot.address.neighborhood,
          city: snapshot.address.city,
          state: snapshot.address.state,
          zipCode: snapshot.address.zipCode,
          location: snapshot.address.location
            ? {
                latitude: snapshot.address.location.latitude,
                longitude: snapshot.address.location.longitude,
              }
            : undefined,
        }
      : undefined,
    contractIds: snapshot.contractIds.map(String),
    createdAt: snapshot.createdAt.toISOString(),
    updatedAt: snapshot.updatedAt.toISOString(),
  };
}

export function toCustomerSearchHitDto(hit: CustomerSearchHitReadModel) {
  return {
    id: hit.id,
    idErp: hit.idErp,
    name: hit.name,
    document: hit.document,
    location: hit.location
      ? {
          latitude: hit.location.latitude,
          longitude: hit.location.longitude,
        }
      : undefined,
  };
}

function mapContracts(
  section: PaginatedReadModel<CustomerContractReadModel>,
) {
  return {
    total: section.total,
    items: section.items.map((item) => ({
      id: item.id,
      idErp: item.idErp,
      status: item.status,
      activatedAt: toIso(item.activatedAt),
    })),
  };
}

function mapLogins(section: PaginatedReadModel<CustomerLoginReadModel>) {
  return {
    total: section.total,
    items: section.items.map((item) => ({
      id: item.id,
      idErp: item.idErp,
      active: item.active,
      contractIdErp: item.contractIdErp,
      ip: item.ip,
      login: item.login,
    })),
  };
}

function mapFibra(section: PaginatedReadModel<CustomerFibraReadModel>) {
  return {
    total: section.total,
    items: section.items.map((item) => ({
      id: item.id,
      idErp: item.idErp,
      loginIdErp: item.loginIdErp,
      onuSerial: item.onuSerial,
      mac: item.mac,
    })),
  };
}

function mapFibraHistorico(
  section: PaginatedReadModel<CustomerFibraHistoricoReadModel>,
) {
  return {
    total: section.total,
    items: section.items.map((item) => ({
      recordedAt: item.recordedAt.toISOString(),
      signalRx: item.signalRx,
    })),
  };
}

function mapFaturas(section: PaginatedReadModel<CustomerFaturaReadModel>) {
  return {
    total: section.total,
    items: section.items.map((item) => ({
      id: item.id,
      idErp: item.idErp,
      status: item.status,
      dueDate: toIso(item.dueDate),
      issuedAt: toIso(item.issuedAt),
      openAmount: item.openAmount,
    })),
  };
}

function mapComodatos(section: PaginatedReadModel<CustomerComodatoReadModel>) {
  return {
    total: section.total,
    items: section.items.map((item) => ({
      id: item.id,
      idErp: item.idErp,
      productDescription: item.productDescription,
      status: item.status,
    })),
  };
}

export function buildCustomerConsultationResponse(input: {
  customerIdErp: string;
  found: boolean;
  included: CustomerConsultSection[];
  cadastro?: Customer;
  contratos?: PaginatedReadModel<CustomerContractReadModel>;
  logins?: PaginatedReadModel<CustomerLoginReadModel>;
  fibra?: PaginatedReadModel<CustomerFibraReadModel>;
  sinal?: { value?: string; error?: string };
  fibraHistorico?: PaginatedReadModel<CustomerFibraHistoricoReadModel>;
  faturas?: PaginatedReadModel<CustomerFaturaReadModel>;
  comodatos?: PaginatedReadModel<CustomerComodatoReadModel>;
  senhasWifi?: { lines: string[] };
  acessoRemoto?: {
    ip: string;
    ports: Array<{ port: number; isOpen: boolean }>;
  };
  warnings?: string[];
}): CustomerConsultationResponseDto {
  return {
    customerId: input.customerIdErp,
    found: input.found,
    included: input.included,
    data: {
      cadastro: input.cadastro ? toCustomerDto(input.cadastro) : undefined,
      contratos: input.contratos ? mapContracts(input.contratos) : undefined,
      logins: input.logins ? mapLogins(input.logins) : undefined,
      fibra: input.fibra ? mapFibra(input.fibra) : undefined,
      sinal: input.sinal,
      fibraHistorico: input.fibraHistorico
        ? mapFibraHistorico(input.fibraHistorico)
        : undefined,
      faturas: input.faturas ? mapFaturas(input.faturas) : undefined,
      comodatos: input.comodatos ? mapComodatos(input.comodatos) : undefined,
      senhasWifi: input.senhasWifi,
      acessoRemoto: input.acessoRemoto,
    },
    warnings: input.warnings?.length ? input.warnings : undefined,
  };
}
