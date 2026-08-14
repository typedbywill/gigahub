import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApplicationError,
  ApplicationErrorCodes,
  GetCustomerConsultationUseCase,
  SearchCustomersUseCase,
} from '@gigahub/application-customer';
import {
  customerConsultationQueryDtoSchema,
  customerSearchQueryDtoSchema,
  type CustomerConsultationResponseDto,
  type CustomerSearchResponseDto,
} from '@gigahub/shared/contracts';
import {
  AccessTokenGuard,
  type AuthenticatedRequest,
} from '../auth/access-token.guard';

@Controller('clientes')
@UseGuards(AccessTokenGuard)
export class ClientesController {
  constructor(
    private readonly searchCustomers: SearchCustomersUseCase,
    private readonly getCustomerConsultation: GetCustomerConsultationUseCase,
  ) {}

  @Get('busca')
  async search(
    @Req() req: AuthenticatedRequest,
    @Query() query: unknown,
  ): Promise<CustomerSearchResponseDto> {
    const parsed = customerSearchQueryDtoSchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'Invalid customer search query',
        details: parsed.error.flatten(),
      });
    }

    try {
      return await this.searchCustomers.execute({
        actorUserId: this.requireUserId(req),
        q: parsed.data.q,
        limit: parsed.data.limit,
      });
    } catch (error) {
      this.rethrowCustomerError(error);
    }
  }

  @Get(':id/consulta')
  async consulta(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Query() query: unknown,
  ): Promise<CustomerConsultationResponseDto> {
    const parsed = customerConsultationQueryDtoSchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'Invalid customer consultation query',
        details: parsed.error.flatten(),
      });
    }

    const data = parsed.data;

    try {
      return await this.getCustomerConsultation.execute({
        actorUserId: this.requireUserId(req),
        customerIdErp: id.trim(),
        include: data.include,
        contractIdErp: data.contractId ? String(data.contractId) : undefined,
        fiberIdErp: data.fiberId ? String(data.fiberId) : undefined,
        contracts: {
          limit: data.contractsLimit,
          offset: data.contractsOffset,
          status: data.contractsStatus,
        },
        logins: {
          limit: data.loginsLimit,
          offset: data.loginsOffset,
          ativo: data.loginsAtivo,
        },
        fibraHistorico: {
          limit: data.fibraHistoricoLimit,
          offset: data.fibraHistoricoOffset,
        },
        faturas: {
          limit: data.faturasLimit,
          offset: data.faturasOffset,
          status: data.faturasStatus,
          onlyOpen: data.faturasOnlyOpen,
        },
        comodatos: {
          limit: data.comodatosLimit,
          offset: data.comodatosOffset,
          statusComodato: data.comodatosStatus,
        },
      });
    } catch (error) {
      this.rethrowCustomerError(error);
    }
  }

  private requireUserId(req: AuthenticatedRequest): string {
    if (!req.userId) {
      throw new BadRequestException({
        error: 'UNAUTHORIZED',
        message: 'Missing authenticated user',
      });
    }
    return req.userId;
  }

  private rethrowCustomerError(error: unknown): never {
    if (error instanceof ApplicationError) {
      if (error.code === ApplicationErrorCodes.InvalidSearchQuery) {
        throw new BadRequestException({
          error: error.code,
          message: error.message,
          details: error.details,
        });
      }
      if (error.code === ApplicationErrorCodes.InvalidConsultationQuery) {
        throw new BadRequestException({
          error: error.code,
          message: error.message,
          details: error.details,
        });
      }
      if (error.code === ApplicationErrorCodes.NotFound) {
        throw new NotFoundException({
          error: error.code,
          message: error.message,
          details: error.details,
        });
      }
      if (error.code === ApplicationErrorCodes.PermissionDenied) {
        throw new ForbiddenException({
          error: error.code,
          message: error.message,
          details: error.details,
        });
      }
    }
    throw error;
  }
}
