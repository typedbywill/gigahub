import type { CustomerConsultationResponseDto } from '@gigahub/shared/contracts';
import type { ResolveEffectiveAccess } from '@gigahub/application-identity';
import { buildCustomerConsultationResponse } from './mappers';
import {
  ApplicationError,
  ApplicationErrorCodes,
  REMOTE_ACCESS_PORTS,
  REMOTE_ACCESS_TIMEOUT_MS,
  type CustomerConsultationCommand,
  type CustomerConsultationQuery,
  type CustomerRegistrationQuery,
  type CustomerRemoteAccessPort,
  type CustomerSignalReaderPort,
} from './ports';

export class GetCustomerConsultationUseCase {
  constructor(
    private readonly registration: CustomerRegistrationQuery,
    private readonly consultation: CustomerConsultationQuery,
    private readonly signalReader: CustomerSignalReaderPort | null,
    private readonly remoteAccess: CustomerRemoteAccessPort,
    private readonly access: ResolveEffectiveAccess,
  ) {}

  async execute(
    command: CustomerConsultationCommand,
  ): Promise<CustomerConsultationResponseDto> {
    await this.access.assertCan(command.actorUserId, 'customer:read');

    if (!command.include.length) {
      throw new ApplicationError(
        ApplicationErrorCodes.InvalidConsultationQuery,
        'At least one include section is required',
      );
    }

    const included = [...command.include];
    const warnings: string[] = [];
    const sections = new Set(included);
    const customerIdErp = command.customerIdErp.trim();

    let cadastro =
      sections.has('cadastro')
        ? await this.registration.findByIdErp(customerIdErp)
        : null;

    if (sections.has('cadastro') && !cadastro) {
      return buildCustomerConsultationResponse({
        customerIdErp,
        found: false,
        included,
        warnings: ['Cliente não encontrado no IXC.'],
      });
    }

    const snapshot = await this.consultation.loadSnapshot(customerIdErp);
    if (!snapshot && !cadastro) {
      return buildCustomerConsultationResponse({
        customerIdErp,
        found: false,
        included,
        warnings: ['Cliente não encontrado no IXC.'],
      });
    }

    if (!cadastro && snapshot) {
      cadastro = await this.registration.findByIdErp(customerIdErp);
    }

    const contractIdErp =
      command.contractIdErp?.trim() || snapshot?.activeContractIdErp;
    const fiberIdErp = command.fiberIdErp?.trim() || snapshot?.activeFiberIdErp;
    const loginIp = snapshot?.loginIp;

    const parallelTasks: Promise<void>[] = [];

    let contratos: Awaited<
      ReturnType<CustomerConsultationQuery['loadContracts']>
    > | undefined;
    let logins: Awaited<ReturnType<CustomerConsultationQuery['loadLogins']>> | undefined;
    let fibra: Awaited<ReturnType<CustomerConsultationQuery['loadFibra']>> | undefined;

    if (sections.has('contratos')) {
      parallelTasks.push(
        this.consultation
          .loadContracts(customerIdErp, command.contracts ?? {})
          .then((result) => {
            contratos = result;
          }),
      );
    }

    if (sections.has('logins')) {
      parallelTasks.push(
        this.consultation
          .loadLogins(customerIdErp, command.logins ?? {})
          .then((result) => {
            logins = result;
          }),
      );
    }

    if (sections.has('fibra')) {
      parallelTasks.push(
        this.consultation
          .loadFibra(
            customerIdErp,
            command.fiberIdErp,
            snapshot?.activeLoginIdErp,
          )
          .then((result) => {
            fibra = result;
          }),
      );
    }

    await Promise.all(parallelTasks);

    let fibraHistorico:
      | Awaited<ReturnType<CustomerConsultationQuery['loadFibraHistorico']>>
      | undefined;
    if (sections.has('fibraHistorico')) {
      const resolvedFiberId =
        fiberIdErp ?? fibra?.items[0]?.idErp ?? snapshot?.activeFiberIdErp;
      if (!resolvedFiberId) {
        warnings.push(
          'fibraHistorico: nenhuma fibra encontrada; informe fiberId.',
        );
      } else {
        fibraHistorico = await this.consultation.loadFibraHistorico(
          resolvedFiberId,
          command.fibraHistorico ?? {},
        );
      }
    }

    let faturas:
      | Awaited<ReturnType<CustomerConsultationQuery['loadFaturas']>>
      | undefined;
    if (sections.has('faturas')) {
      if (!contractIdErp) {
        warnings.push(
          'faturas: nenhum contrato encontrado; informe contractId.',
        );
      } else {
        faturas = await this.consultation.loadFaturas(
          contractIdErp,
          command.faturas ?? {},
        );
      }
    }

    let comodatos:
      | Awaited<ReturnType<CustomerConsultationQuery['loadComodatos']>>
      | undefined;
    if (sections.has('comodatos')) {
      if (!contractIdErp) {
        warnings.push(
          'comodatos: nenhum contrato encontrado; informe contractId.',
        );
      } else {
        comodatos = await this.consultation.loadComodatos(
          contractIdErp,
          command.comodatos ?? {},
        );
      }
    }

    let sinal: { value?: string; error?: string } | undefined;
    if (sections.has('sinal')) {
      const resolvedFiberId =
        fiberIdErp ?? fibra?.items[0]?.idErp ?? snapshot?.activeFiberIdErp;
      if (!resolvedFiberId) {
        warnings.push('sinal: nenhuma fibra encontrada para leitura.');
      } else if (!this.signalReader) {
        warnings.push('sinal: serviço NOC não configurado.');
      } else {
        const readings = await this.signalReader.readSignal([resolvedFiberId]);
        const reading = readings[0];
        sinal = {
          value: reading?.value,
          error: reading?.error,
        };
      }
    }

    let senhasWifi: { lines: string[] } | undefined;
    if (sections.has('senhasWifi')) {
      const lines = await this.consultation.loadSenhasWifi(customerIdErp);
      senhasWifi = { lines };
    }

    let acessoRemoto:
      | { ip: string; ports: Array<{ port: number; isOpen: boolean }> }
      | undefined;
    if (sections.has('acessoRemoto')) {
      if (!loginIp) {
        warnings.push('acessoRemoto: IP do login ativo não encontrado.');
      } else {
        const ports = await this.remoteAccess.checkPorts(
          loginIp,
          REMOTE_ACCESS_PORTS,
          REMOTE_ACCESS_TIMEOUT_MS,
        );
        acessoRemoto = { ip: loginIp, ports };
      }
    }

    const found = sections.has('cadastro') ? Boolean(cadastro) : Boolean(snapshot);

    return buildCustomerConsultationResponse({
      customerIdErp,
      found,
      included,
      cadastro: cadastro ?? undefined,
      contratos,
      logins,
      fibra,
      sinal,
      fibraHistorico,
      faturas,
      comodatos,
      senhasWifi,
      acessoRemoto,
      warnings: warnings.length ? warnings : undefined,
    });
  }
}
